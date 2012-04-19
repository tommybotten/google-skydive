(function ($) {
    $(document).ready(function(){
        $(document).keydown(function(e){
            Engine.pressedKeys[e.keyCode] = true;

            if (e.keyCode == 'A'.charCodeAt(0)) {
                Map.changeZoomLevel(-1);
            }
            if (e.keyCode == 'Z'.charCodeAt(0)) {
                Map.changeZoomLevel(1);
            }
            if (e.keyCode == 'Q'.charCodeAt(0)) {
                Map.googleMap.setCenter(Map.userMarker.getPosition());
            }
        });
        $(document).keyup(function(e){
            Engine.pressedKeys[e.keyCode] = false;
        });
        $("input").change( function() {
            Config.init();
        });

        Map.init();
        Config.init();
        Parachute.init(Config.initialAltitude, Config.windDirection, Map.userMarker);
    });

    var Map = {
        init: function() {
            var mapOptions = {
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
            this.googleMap = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

            this.overlay = new google.maps.OverlayView({map: this.googleMap});
            this.overlay.draw = function() {};
            this.overlay.setMap(this.googleMap);

            this.targetMarker = new google.maps.Marker({
                position: new google.maps.LatLng(61.77371, 22.71724),
                map: this.googleMap,
                draggable: true,
                icon: "http://www.google.com/mapfiles/arrow.png"
            });

            this.planeMarker = new google.maps.Marker({
                position: new google.maps.LatLng(61.76371, 22.71724),
                map: this.googleMap,
                draggable: true,
                icon: "img/airplane.png"
            });

            this.userMarker = new google.maps.Marker({
                position: this.planeMarker.getPosition(),
                visible: false
            });

            var that = this; // hack scoping
            google.maps.event.addListener(this.planeMarker, 'dblclick', function(event) {
                that.userMarker.setPosition(that.planeMarker.getPosition());
                that.userMarker.setMap(that.googleMap);
                Engine.start();
            });

            google.maps.event.addListener(this.planeMarker, 'dragend', function(event) {
                var targetPos = that.targetMarker.getPosition();
                var planePos = that.planeMarker.getPosition();
                var bearing = CalcBearingBetween(targetPos, planePos);
                $("#StaticWindDirection").val(Math.round(bearing)).change();

                var targetDistance = CalcDistanceBetween(targetPos, planePos);
                $("#TargetDistance").text(Math.round(targetDistance));
            });
        },
        changeZoomLevel: function(delta) {
            var newZoom = this.googleMap.getZoom() + delta;
            if (newZoom >= 0 && newZoom <= 19) {
                this.googleMap.setZoom(newZoom);
                this.googleMap.setCenter(this.userMarker.getPosition());
            }
        }
    }
    
    var Config = {
        init: function() {
            this.parachuteSpeed = parseFloat($("#StaticParachuteSpeed").val());
            this.parachuteTurnSpeed = parseFloat($("#StaticParachuteTurnSpeed").val());
            this.dropSpeed = parseFloat($("#StaticDropSpeed").val());
            this.initialAltitude = parseFloat($("#InitialAltitude").val());
            this.mapAutoCenter = $("#MapAutoCenter").is(':checked'); 
            this.windDirection = parseFloat($("#StaticWindDirection").val()) - 180;
            this.windSpeed = parseFloat($("#StaticWindSpeed").val());
            
            var pos = Map.planeMarker.getPosition();
            this.metersPerLat = 1 / CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat() + 1, pos.lng()));
            this.metersPerLng = 1 / CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat(), pos.lng()+1));

            $("#windArrow").rotate({animateTo:this.windDirection});
        }
    }

    var Parachute = {
        init: function(altitude, heading, marker) {
            this.setAltitude(altitude);
            this.setHeading(heading);  
            this.marker = marker;
        },
        hasLanded: function() {
            return this.altitude <= 0;
        },
        land: function() {
            new google.maps.Circle({
                strokeColor: "#00FF00",
                strokeOpacity: 1,
                strokeWeight: 1,
                fillColor: "#0000FF",
                fillOpacity: 0.5,
                map: Map.googleMap,
                center: this.marker.getPosition(),
                radius: 30
            });
        },  
        descent: function(meters) {
            var drop = (this.altitude > meters) ? meters : this.altitude;
            this.setAltitude(this.altitude - drop);
            if (this.hasLanded()) {
              this.land();
            }
        },
        turn: function(degrees) {
            this.setHeading(this.heading + degrees);
        },
        fly: function(dX, dY) {
            var oldPos = this.marker.getPosition();
            this.marker.setPosition(new google.maps.LatLng(oldPos.lat() + dY * Config.metersPerLat, 
                                                           oldPos.lng() + dX * Config.metersPerLng));
                                                           
            var point = Map.overlay.getProjection().fromLatLngToContainerPixel(this.marker.getPosition());
            $("#parachute").css('top', Math.round(point.y-10)).css('left', Math.round(point.x-5));
        },
        setAltitude: function(altitude) {
            this.altitude = altitude;
            $("#CurrentAltitude").text(Math.round(Parachute.altitude));
            $("#altimeterArrow").rotate({animateTo:(Parachute.altitude / 4000) * 360});
            
            var textColor = '#FFFFFF';
            if (Parachute.altitude < 300) {
                textColor = '#FFAAAA';
            } else if (Parachute.altitude < 600) {
                textColor = '#FFFF00';
            }
            $("#CurrentAltitude").css('color', textColor);
        },
        setHeading: function(heading) {
            this.heading = heading;
            $("#parachute").rotate({animateTo:this.heading});
        }
    }

    var Engine = {
        pressedKeys: {},
        start: function() {
            if (this.running()) {
                this.stop();
            }
            
            Parachute.init(Config.initialAltitude, Config.windDirection, Map.userMarker);

            var that = this; // hack scoping
            this.LastUpdate = new Date().getTime();
            this.IntervalID = setInterval(function() {
                var currentTime = new Date().getTime();
                var delta = (currentTime - that.LastUpdate) / 1000;
                that.LastUpdate = currentTime;
                that.tick(delta);
            }, 30);
        },
        stop: function() {
            clearInterval(this.IntervalID);
            this.IntervalID = false;
        },
        running: function() {
            return this.IntervalID != false;
        },
        tick: function(delta) {
            // heading
            var turningLeft = this.pressedKeys[37];
            var turningRight = this.pressedKeys[39];
            if (turningLeft || turningRight) { 
                Parachute.turn(delta * Config.parachuteTurnSpeed * (turningLeft ? -1 : 1));
            }

            // static parachute speed           
            var dX = Math.sin(toRadians(Parachute.heading)) * delta * Config.parachuteSpeed;
            var dY = Math.cos(toRadians(Parachute.heading)) * delta * Config.parachuteSpeed;
            // wind speed
            dX += Math.sin(toRadians(Config.windDirection)) * delta * Config.windSpeed;
            dY += Math.cos(toRadians(Config.windDirection)) * delta * Config.windSpeed;
            // fly
            Parachute.fly(dX, dY);
            
            // drop
            Parachute.descent(delta * Config.dropSpeed);
            if (turningLeft || turningRight) {
                // just try to simulate turning..
                Parachute.descent(delta * 3 * Config.dropSpeed);
            }

            var landSpeed = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)) / delta;
            $("#LandSpeed").text(Math.round(landSpeed));
            var targetDistance = CalcDistanceBetween(Parachute.marker.getPosition(), Map.targetMarker.getPosition());
            $("#TargetDistance").text(Math.round(targetDistance));
            
            if (Config.mapAutoCenter) {
                Map.googleMap.setCenter(Parachute.marker.getPosition());
            }
            
            if (Parachute.hasLanded()) {
                this.stop();
            }
        }
    }

    // common utility functions
    function CalcDistanceBetween(latlng1, latlng2) {
        var lat1 = latlng1.lat();
        var lon1 = latlng1.lng();
        var lat2 = latlng2.lat();
        var lon2 = latlng2.lng();
        
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
    
    function CalcBearingBetween(latlng1, latlng2) {
        var lat1 = latlng1.lat();
        var lon1 = latlng1.lng();
        var lat2 = latlng2.lat();
        var lon2 = latlng2.lng();
        
        var latRad1 = toRadians(lat1);
        var latrad2 = toRadians(lat2);
        var dLon = toRadians(lon2 - lon1);

        var y = Math.sin(dLon) * Math.cos(latrad2);
        var x = Math.cos(latRad1) * Math.sin(latrad2) -
        Math.sin(latRad1) * Math.cos(latrad2) * Math.cos(dLon);
        var deg = toDegrees(Math.atan2(y, x));
        return (deg >= 0) ? deg : 360 + deg;
    }
    
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    function toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
})(jQuery);