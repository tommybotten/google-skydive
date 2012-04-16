(function ($) {
    var Parameters = {
        windDirection: 0,
        windSpeed: 0,
        parachuteSpeed: 0,
        parachuteTurnSpeed: 0,
        dropSpeed: 0,
        initialAltitude: 0,
        mapAutoCenter: false
    }
    
    var Parachute = {
        altitude: 0,
        heading: 0
    }

    var IntervalID = false;
    var pressedKeys = {};
    var LastUpdate;
     
    $(document).ready(function(){
        $(document).keydown(function(e){
            pressedKeys[e.keyCode] = true;
            
            if (pressedKeys['A'.charCodeAt(0)]) {
                changeZoomLevel(-1);
            }
            if (pressedKeys['Z'.charCodeAt(0)]) {
                changeZoomLevel(1);
            }
            if (pressedKeys['Q'.charCodeAt(0)]) {
                Map.googleMap.setCenter(Map.userMarker.getPosition());
            }
        });
        $(document).keyup(function(e){
            pressedKeys[e.keyCode] = false;
        });
        $("input").change( function() {
            loadVariables();
        });
        
        loadVariables();
        Parachute.altitude = Parameters.initialAltitude;
        Parachute.heading = Parameters.windDirection;
        updateAltimeter();
    });
    
    function changeZoomLevel(delta) {
        var newZoom = Map.googleMap.getZoom() + delta;
        if (newZoom >= 0 && newZoom <= 19) { 
            Map.googleMap.setZoom(newZoom);
            Map.googleMap.setCenter(Map.userMarker.getPosition());
        }
    }

    function initializeDescent(x, y) {
        loadVariables();
        Parachute.altitude = Parameters.initialAltitude;
        Parachute.heading = Parameters.windDirection;
        
        var pos = Map.userMarker.getPosition();
        MetersPerLat = 1 / CalcDistanceBetween(pos.lat(), pos.lng(), pos.lat()+1, pos.lng());
        MetersPerLng = 1 / CalcDistanceBetween(pos.lat(), pos.lng(), pos.lat(), pos.lng()+1);
        
        LastUpdate = new Date().getTime();
        
        if (IntervalID) {
            clearInterval(IntervalID);
            IntervalID = false;
        }
        
        IntervalID = setInterval(function() {
            var currentTime = new Date().getTime();
            var delta = (currentTime - LastUpdate) / 1000;
            LastUpdate = currentTime;
            mainLoop(delta); 
        }, 30);
    }
    
    function loadVariables() {
        Parameters.windDirection = parseFloat($("#StaticWindDirection").val()) - 180;
        Parameters.windSpeed = parseFloat($("#StaticWindSpeed").val());
        Parameters.parachuteSpeed = parseFloat($("#StaticParachuteSpeed").val());
        Parameters.parachuteTurnSpeed = parseFloat($("#StaticParachuteTurnSpeed").val());
        Parameters.dropSpeed = parseFloat($("#StaticDropSpeed").val());
        Parameters.initialAltitude = parseFloat($("#InitialAltitude").val());
        Parameters.mapAutoCenter = $("#MapAutoCenter").is(':checked');
        
        updateWindArrow();
    }
 
    function mainLoop(delta) {
        // heading
        var turningLeft = pressedKeys[37];
        var turningRight = pressedKeys[39];
        if (turningLeft || turningRight) {
            Parachute.heading += delta * Parameters.parachuteTurnSpeed    * (turningLeft ? -1 : 1);
        }
             
        // drop 
        Parachute.altitude -= delta * Parameters.dropSpeed;
        if (turningLeft || turningRight) {
            // just try to simulate turning..
            Parachute.altitude -= delta * 5 * Parameters.dropSpeed;
        }
        
        // static parachute speed
        var dX = Math.sin(toRadians(Parachute.heading)) * delta * Parameters.parachuteSpeed;
        var dY = Math.cos(toRadians(Parachute.heading)) * delta * Parameters.parachuteSpeed;    
        // wind speed
        dX += Math.sin(toRadians(Parameters.windDirection)) * delta * Parameters.windSpeed;
        dY += Math.cos(toRadians(Parameters.windDirection)) * delta * Parameters.windSpeed;    
        
        var latlng = new google.maps.LatLng(Map.userMarker.getPosition().lat() + dY * MetersPerLat, 
                                                                                Map.userMarker.getPosition().lng() + dX * MetersPerLng);
        Map.userMarker.setPosition(latlng);
        var point = Map.overlay.getProjection().fromLatLngToContainerPixel(latlng);
        var landSpeed = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)) / delta;
        var targetDistance = CalcDistanceBetween(latlng.lat(), latlng.lng(), Map.targetMarker.getPosition().lat(), Map.targetMarker.getPosition().lng());
        
        if (Parameters.mapAutoCenter) {
            Map.googleMap.setCenter(Map.userMarker.getPosition());
        }
        
        if (Parachute.altitude <= 0) {
            Parachute.altitude = 0;
            clearInterval(IntervalID);
            IntervalID = false;
            
            var landingCircle = {
              strokeColor: "#00FF00",
              strokeOpacity: 1,
              strokeWeight: 1,
              fillColor: "#0000FF",
              fillOpacity: 0.5,
              map: Map.googleMap,
              center: latlng,
              radius: 30
            };
            cityCircle = new google.maps.Circle(landingCircle);

        } else if (Parachute.altitude < 300) { 
            $("#CurrentAltitude").css('color', '#FFAAAA');
        } else if (Parachute.altitude < 600) {
            $("#CurrentAltitude").css('color', '#FFFF00');
        } else {
            $("#CurrentAltitude").css('color', '#FFFFFF');
        }
        
        $("#CurrentAltitude").text(Math.round(Parachute.altitude));
        $("#LandSpeed").text(Math.round(landSpeed));
        $("#TargetDistance").text(Math.round(targetDistance));
        $("#parachute").css('top', Math.round(point.y-10)).css('left', Math.round(point.x-5));
        $("#parachute").rotate({animateTo:Parachute.heading});
        
        updateAltimeter();
    }
    
    function updateAltimeter() {
        $("#altimeterArrow").rotate({animateTo:(Parachute.altitude / 4000) * 360});
    }
    
    function updateWindArrow() {
        $("#windArrow").rotate({animateTo:Parameters.windDirection});
    }
    
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    function toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
 
    function CalcDistanceBetween(lat1, lon1, lat2, lon2) {
        var R = 6371 * 1000; 
        var dLat = toRadians(lat2-lat1);
        var dLon = toRadians(lon2 - lon1);
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c;
        return d;
    }
    
    function CalcBearingBetween(lat1, lon1, lat2, lon2) {
        var latRad1 = toRadians(lat1); 
        var latrad2 = toRadians(lat2);
        var dLon = toRadians(lon2 - lon1);
        
        var y = Math.sin(dLon) * Math.cos(latrad2);
        var x = Math.cos(latRad1) * Math.sin(latrad2) -
        Math.sin(latRad1) * Math.cos(latrad2) * Math.cos(dLon);
        var deg = toDegrees(Math.atan2(y, x));
        return (deg >= 0) ? deg : 360 + deg;
    }
 
    // init map
    var Map = {
        googleMap: null,
        overlay: null,
        userMarker: null,
        targetMarker: null,
        planeMarker: null
    }
    
    function initializeGoogleMap() {
        var myOptions = {
            zoom: 14,
            center: new google.maps.LatLng(61.77471, 22.71724),
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            disableDefaultUI: true,
            scrollwheel: true,
            navigationControl: true,
            navigationControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
            mapTypeControl: true,
            scaleControl: true,
            scaleControlOptions: { position: google.maps.ControlPosition.BOTTOM_CENTER },
            draggable: true,
            disableDoubleClickZoom: true     
        };
        Map.googleMap = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
        
        Map.overlay = new google.maps.OverlayView();
        Map.overlay.draw = function() {};
        Map.overlay.setMap(Map.googleMap); 
        
        Map.targetMarker = new google.maps.Marker({
            position: new google.maps.LatLng(61.77371, 22.71724),
            map: Map.googleMap,
            draggable: true,
            icon: "http://www.google.com/mapfiles/arrow.png"
        });
        
        Map.planeMarker = new google.maps.Marker({
            position: new google.maps.LatLng(61.76371, 22.71724),
            map: Map.googleMap,
            draggable: true,
            icon: "img/airplane.png"
        });
        
        Map.userMarker = new google.maps.Marker({
            position: Map.planeMarker.getPosition(),
            visible: false
        });
        
        google.maps.event.addListener(Map.planeMarker, 'dblclick', function(event) {
            Map.userMarker.setPosition(Map.planeMarker.getPosition());
            Map.userMarker.setMap(Map.googleMap);
            initializeDescent();
        });
        
        google.maps.event.addListener(Map.planeMarker, 'dragend', function(event) {
            var pos1 = Map.targetMarker.getPosition();
            var pos2 = Map.planeMarker.getPosition();
            var bearing = CalcBearingBetween(pos1.lat(), pos1.lng(), pos2.lat(), pos2.lng());
            $("#StaticWindDirection").val(Math.round(bearing));
            loadVariables();
            
            var targetDistance = CalcDistanceBetween(pos1.lat(), pos1.lng(), pos2.lat(), pos2.lng());
            $("#TargetDistance").text(Math.round(targetDistance));
        });
    }
    
    google.maps.event.addDomListener(window, 'load', initializeGoogleMap);
})(jQuery);