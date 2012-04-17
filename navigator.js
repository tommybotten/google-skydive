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
            Parameters.init();
        });

        Map.init();
        Parameters.init();
        Parachute.init(Parameters.initialAltitude, Parameters.windDirection);
    });

    var Map = {
        init: function() {
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
            this.googleMap = new google.maps.Map(document.getElementById('map_canvas'), myOptions);

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
                var pos1 = that.targetMarker.getPosition();
                var pos2 = that.planeMarker.getPosition();
                var bearing = CalcBearingBetween(pos1.lat(), pos1.lng(), pos2.lat(), pos2.lng());
                $("#StaticWindDirection").val(Math.round(bearing)).change();

                var targetDistance = CalcDistanceBetween(pos1.lat(), pos1.lng(), pos2.lat(), pos2.lng());
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

    var Parameters = {
        init: function() {
            this.parachuteSpeed = parseFloat($("#StaticParachuteSpeed").val());
            this.parachuteTurnSpeed = parseFloat($("#StaticParachuteTurnSpeed").val());
            this.dropSpeed = parseFloat($("#StaticDropSpeed").val());
            this.initialAltitude = parseFloat($("#InitialAltitude").val());
            this.mapAutoCenter = $("#MapAutoCenter").is(':checked'); 
            this.windDirection = parseFloat($("#StaticWindDirection").val()) - 180;
            this.windSpeed = parseFloat($("#StaticWindSpeed").val());
            updateWindArrow();
        }
    }

    var Parachute = {
        init: function(altitude, heading) {
            this.altitude = altitude;
            this.heading = heading;
            updateAltimeter();
        },
        hasLanded: function() {
            return this.altitude <= 0;
        },
        descent: function(meters) {
            this.altitude = (this.altitude - meters >= 0) ? this.altitude - meters : 0;
        },
        turn: function(degrees) {
            this.heading += degrees;
        }
    }

    var Engine = {
        pressedKeys: {},
        start: function() {
            if (this.running()) {
                this.stop();
            }
            Parachute.init(Parameters.initialAltitude, Parameters.windDirection);
            
            var pos = Map.userMarker.getPosition();
            this.metersPerLat = 1 / CalcDistanceBetween(pos.lat(), pos.lng(), pos.lat()+1, pos.lng());
            this.metersPerLng = 1 / CalcDistanceBetween(pos.lat(), pos.lng(), pos.lat(), pos.lng()+1);

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
                Parachute.turn(delta * Parameters.parachuteTurnSpeed * (turningLeft ? -1 : 1));
            }

            // drop
            Parachute.descent(delta * Parameters.dropSpeed);
            if (turningLeft || turningRight) {
                // just try to simulate turning..
                Parachute.descent(delta * 5 * Parameters.dropSpeed);
            }

            // static parachute speed
            var dX = Math.sin(toRadians(Parachute.heading)) * delta * Parameters.parachuteSpeed;
            var dY = Math.cos(toRadians(Parachute.heading)) * delta * Parameters.parachuteSpeed;
            // wind speed
            dX += Math.sin(toRadians(Parameters.windDirection)) * delta * Parameters.windSpeed;
            dY += Math.cos(toRadians(Parameters.windDirection)) * delta * Parameters.windSpeed;

            var latlng = new google.maps.LatLng(Map.userMarker.getPosition().lat() + dY * this.metersPerLat,
                                                Map.userMarker.getPosition().lng() + dX * this.metersPerLng);
            Map.userMarker.setPosition(latlng);
            var point = Map.overlay.getProjection().fromLatLngToContainerPixel(latlng);
            var landSpeed = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)) / delta;
            var targetDistance = CalcDistanceBetween(latlng.lat(), latlng.lng(), Map.targetMarker.getPosition().lat(), Map.targetMarker.getPosition().lng());

            $("#CurrentAltitude").text(Math.round(Parachute.altitude));
            $("#LandSpeed").text(Math.round(landSpeed));
            $("#TargetDistance").text(Math.round(targetDistance));
            $("#parachute").css('top', Math.round(point.y-10)).css('left', Math.round(point.x-5));
            $("#parachute").rotate({animateTo:Parachute.heading});
            updateAltimeter();

            if (Parachute.hasLanded()) {
                this.stop();
                new google.maps.Circle({
                    strokeColor: "#00FF00",
                    strokeOpacity: 1,
                    strokeWeight: 1,
                    fillColor: "#0000FF",
                    fillOpacity: 0.5,
                    map: Map.googleMap,
                    center: latlng,
                    radius: 30
                });

            } else if (Parachute.altitude < 300) {
                $("#CurrentAltitude").css('color', '#FFAAAA');
            } else if (Parachute.altitude < 600) {
                $("#CurrentAltitude").css('color', '#FFFF00');
            } else {
                $("#CurrentAltitude").css('color', '#FFFFFF');
            }
            
            if (Parameters.mapAutoCenter) {
                Map.googleMap.setCenter(Map.userMarker.getPosition());
            }
        }
    }

    // common utility functions
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
})(jQuery);