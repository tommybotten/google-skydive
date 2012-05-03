(function ($) {
    $(document).ready(function(){
        $(document).keydown(function(e){
            Engine.pressedKeys[e.keyCode] = true;
        });
        $(document).keyup(function(e){
            Engine.pressedKeys[e.keyCode] = false;
        });
        $("#helpIcon").click(function() {
            $("#help").toggle('slide');
            $("#helpIcon").toggleClass('toggled');
        });
        $("#settingsIcon").click(function() {
            $("#settings").toggle('slide');
            $("#settingsIcon").toggleClass('toggled');
        });
        $("#jumpIcon").click(function() {
            if ($("#jumpIcon").hasClass('toggled')) {
                Parachute.stop();
            } else {
                Parachute.start();
            }
            $("#jumpIcon").toggleClass('toggled');
        });

        Config.init();
        Map.init(function() {
            Parachute.reset();
        });
    });

    var Map = {
        init: function(callback) {
            var mapOptions = {
                zoom: Config.MapZoom,
                center: new google.maps.LatLng(Config.PlaneLatitude, Config.PlaneLongitude),
                mapTypeId: google.maps.MapTypeId.SATELLITE,
                disableDefaultUI: true,
                navigationControl: true,
                navigationControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
                mapTypeControl: true,
                scaleControl: true,
                scaleControlOptions: { position: google.maps.ControlPosition.BOTTOM_CENTER },
                disableDoubleClickZoom: true
            };
            this.googleMap = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

            this.targetMarker = new MarkerWithLabel({
                position: new google.maps.LatLng(Config.TargetLatitude, Config.TargetLongitude),
                map: this.googleMap,
                draggable: true,
                icon: "http://www.google.com/mapfiles/arrow.png",
                labelAnchor: new google.maps.Point(22, 0),
                labelClass: "TargetDistanceLabel", 
            });

            this.planeMarker = new google.maps.Marker({
                position: new google.maps.LatLng(Config.PlaneLatitude, Config.PlaneLongitude),
                map: this.googleMap,
                draggable: true,
                icon: "img/airplane.png"
            });

            var parachuteImg = document.createElement("img");
            parachuteImg.src = "img/parachute.png";
            parachuteImg.setAttribute("id", "parachute");

            this.parachuteMarker = new MarkerWithLabel({
                position: this.planeMarker.getPosition(),
                map: this.googleMap,
                visible: false,
                icon: "img/blank.png",
                labelContent: parachuteImg,
                labelAnchor: new google.maps.Point(13, 14),
                zIndex: 1000000
            });

            var that = this; // hack scoping
            google.maps.event.addListener(this.planeMarker, 'dragend', function(event) {
                that.parachuteMarker.setPosition(that.planeMarker.getPosition());
                var bearing = CalcBearingBetween(that.targetMarker.getPosition(), that.planeMarker.getPosition());
                
                Config.WindDirectionChanged(Math.round(bearing));
                UpdateTargetDistance();
            });  
            
            google.maps.event.addListener(this.targetMarker, 'dragend', function(event) {
                UpdateTargetDistance();
            });
            
            var pos = Map.planeMarker.getPosition();
            this.metersPerLat = 1 / CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat() + 1, pos.lng()));
            this.metersPerLng = 1 / CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat(), pos.lng()+1)); 
            
            google.maps.event.addListenerOnce(this.googleMap, 'idle', function(){
                UpdateTargetDistance();
                callback();
            });
        }
    }
    
    var Parachute = {
        reset: function() {
            this.setAltitude(Config.InitialAltitude);
            this.setHeading(Config.WindDirection);
            Map.parachuteMarker.setPosition(Map.planeMarker.getPosition());
            UpdateTargetDistance();
        },
        start: function() {
            this.reset();
            Map.parachuteMarker.setVisible(true);
            Map.planeMarker.setVisible(false);
            Engine.start();
        },   
        stop: function() {
            Map.parachuteMarker.setVisible(false);
            Map.planeMarker.setVisible(true);
            Engine.stop();
            this.reset();
        },  
        rotate: function(degrees) {
            this.setHeading(this.heading + degrees);
        },
        move: function(dX, dY, dZ) {
            // xy-plane
            var oldPos = Map.parachuteMarker.getPosition();
            Map.parachuteMarker.setPosition(new google.maps.LatLng(oldPos.lat() + dY * Map.metersPerLat, oldPos.lng() + dX * Map.metersPerLng));
            UpdateTargetDistance();
            
            // z-plane
            var drop = (this.altitude > dZ) ? dZ : this.altitude;
            this.setAltitude(this.altitude - drop);
            if (this.altitude <= 0) {
                Engine.stop();
                new google.maps.Circle({
                    strokeColor: "#00FF00",
                    strokeOpacity: 1,
                    strokeWeight: 1,
                    fillColor: "#0000FF",
                    fillOpacity: 0.5,
                    map: Map.googleMap,
                    center: Map.parachuteMarker.getPosition(),
                    radius: 30
                });
            }
            
            if (Config.MapAutoCenter) {
                Map.googleMap.setCenter(Map.parachuteMarker.getPosition());
            }
        },
        setAltitude: function(altitude) {
            this.altitude = altitude;
            $("#CurrentAltitude").text(Math.round(Parachute.altitude));
            $("#altimeterArrow").rotate({animateTo:(Parachute.altitude / 4000) * 360});
        },
        setHeading: function(heading) {
            this.heading = heading;
            $("#parachute").rotate({animateTo:this.heading});
        }
    }

    var Engine = {
        pressedKeys: {},
        IntervalID: false,
        start: function() {
            if (this.IntervalID != false) {
                this.stop();
            }
            
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
        tick: function(delta) {
            // heading
            var turningLeft = this.pressedKeys[37];
            var turningRight = this.pressedKeys[39];
            if (turningLeft || turningRight) { 
                Parachute.rotate(delta * Config.ParachuteTurnSpeed * (turningLeft ? -1 : 1));
            }

            // parachute speed           
            var dX = Math.sin(toRadians(Parachute.heading)) * delta * Config.ParachuteSpeed;
            var dY = Math.cos(toRadians(Parachute.heading)) * delta * Config.ParachuteSpeed;
            // wind speed
            dX += Math.sin(toRadians(Config.WindDirection)) * delta * Config.WindSpeed;
            dY += Math.cos(toRadians(Config.WindDirection)) * delta * Config.WindSpeed;

            // drop
            var dZ = delta * Config.DropSpeed;
            if (turningLeft || turningRight) {
                // just try to simulate turning..
                dZ += delta * 3 * Config.DropSpeed;
            }

            Parachute.move(dX, dY, dZ);
        }
    }
    
    
    var Config = {
        MapZoom: 14,
        PlaneLatitude: 61.76371,
        PlaneLongitude: 22.71724,
        TargetLatitude: 61.77371, 
        TargetLongitude: 22.71724,
        InitialAltitude: 1000,
        ParachuteTurnSpeed: 150,
        WindDirection: 180,
        WindSpeed: 5,
        ParachuteSpeed: 8,
        DropSpeed: 3,
        MapAutoCenter: false,
        
        init: function() {
            this.loadSettingsFromUrl();
          
            var that = this; // hack scoping
            $("#WindDirectionSlider").slider({
                min: 0, 
                max: 361, 
                step: 10, 
                slide: function() { that.WindDirectionChanged($(this).slider("value")); }
            });
            $("#WindDirection").change(function() {
                that.WindDirectionChanged(parseInt($(that).val()));
            });

            $("#WindSpeedSlider").slider({
                min: 0, 
                max: 15, 
                step: 1, 
                range: 'min',
                value: this.WindSpeed, 
                slide: function() { that.WindSpeedChanged($(this).slider("value")); }
            });
            $("#WindSpeed").change(function() {
                that.WindSpeedChanged(parseInt($(that).val()));
            });
            
            $("#ParachuteSpeedSlider").slider({
                min: 0, 
                max: 15, 
                step: 1, 
                range: 'min',
                value: this.ParachuteSpeed, 
                slide: function() { that.ParachuteSpeedChanged($(this).slider("value")); }
            });
            $("#ParachuteSpeed").change(function() {
                that.ParachuteSpeedChanged(parseInt($(that).val()));
            });
            
            $("#DropSpeedSlider").slider({
                min: 0, 
                max: 50, 
                step: 1, 
                value: this.DropSpeed,
                range: 'min',
                value: this.DropSpeed, 
                slide: function() { that.DropSpeedChanged($(this).slider("value")); }
            });
            $("#DropSpeed").change(function() {
                that.DropSpeedChanged(parseInt($(that).val()));
            });
            
            $("#MapAutoCenter").attr('checked', this.MapAutoCenter);
            
            $(".slider .ui-slider-handle").unbind('keydown');
            
            this.WindDirectionChanged(this.WindDirection);
            this.WindSpeedChanged(this.WindSpeed);
            this.ParachuteSpeedChanged(this.ParachuteSpeed);
            this.DropSpeedChanged(this.DropSpeed);
 
            this.saveSettingsToUrl();
        },
        loadSettingsFromUrl: function() {
            this.MapZoom = parseInt(getRequestParameter('MapZoom')) || this.MapZoom;
            this.MapLatitude = parseFloat(getRequestParameter('MapLatitude')) || this.MapLatitude;
            this.MapLongitude = parseFloat(getRequestParameter('MapLongitude')) || this.MapLongitude;
            this.PlaneLatitude = parseFloat(getRequestParameter('PlaneLatitude')) || this.PlaneLatitude;
            this.PlaneLongitude = parseFloat(getRequestParameter('PlaneLongitude')) || this.PlaneLongitude;
            this.TargetLatitude = parseFloat(getRequestParameter('TargetLatitude')) || this.TargetLatitude;
            this.TargetLongitude = parseFloat(getRequestParameter('TargetLongitude')) || this.TargetLongitude;
            this.WindDirection = parseInt(getRequestParameter('WindDirection')) || this.WindDirection;
            this.WindSpeed = parseInt(getRequestParameter('WindSpeed')) || this.WindSpeed;
            this.ParachuteSpeed = parseInt(getRequestParameter('ParachuteSpeed')) || this.ParachuteSpeed;
            this.ParachuteTurnSpeed = parseInt(getRequestParameter('ParachuteTurnSpeed')) || this.ParachuteTurnSpeed;
            this.DropSpeed = parseInt(getRequestParameter('DropSpeed')) || this.DropSpeed;
            this.MapAutoCenter = getRequestParameter('MapAutoCenter') || this.MapAutoCenter;
            this.InitialAltitude = parseInt(getRequestParameter('InitialAltitude')) || this.InitialAltitude;
        },
        saveSettingsToUrl: function() {
            var values = {
                MapZoom: this.MapZoom,
                MapLatitude: this.MapLatitude,
                MapLongitude: this.MapLongitude,
                PlaneLatitude: this.PlaneLatitude,
                PlaneLongitude: this.PlaneLongitude,
                TargetLatitude: this.TargetLatitude, 
                TargetLongitude: this.TargetLongitude,
                InitialAltitude: this.InitialAltitude,
                ParachuteTurnSpeed: this.ParachuteTurnSpeed,
                WindDirection: this.WindDirection + 180,
                WindSpeed: this.WindSpeed,
                ParachuteSpeed: this.ParachuteSpeed,
                DropSpeed: this.DropSpeed,
                MapAutoCenter: this.MapAutoCenter
            };
            $('#Link').attr('href', '?' + $.param(values));
        },
        WindDirectionChanged: function(value) {
            this.WindDirection = value - 180
            $("#windArrow").rotate({animateTo:this.WindDirection});
            $("#WindDirectionSlider").slider("value", value);
            $("#WindDirection").val(value);
            this.saveSettingsToUrl();
        },
        WindSpeedChanged: function(value) {
            this.WindSpeed = value;
            $("#WindSpeedSlider").slider("value", value);
            $("#WindSpeed").val(value);
            this.saveSettingsToUrl();
        },  
        ParachuteSpeedChanged: function(value) {
            this.ParachuteSpeed = value;
            $("#ParachuteSpeedSlider").slider("value", value);
            $("#ParachuteSpeed").val(value);
            this.saveSettingsToUrl();
        },  
        DropSpeedChanged: function(value) {
            this.DropSpeed = value;
            $("#DropSpeedSlider").slider("value", value);
            $("#DropSpeed").val(value);
            this.saveSettingsToUrl();
        }
    }
    
    function UpdateTargetDistance() {
        var targetDistance = CalcDistanceBetween(Map.parachuteMarker.getPosition(), Map.targetMarker.getPosition());
        $(".TargetDistanceLabel").text(Math.round(targetDistance));
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

    function getRequestParameter(name)
    {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
          return "";
        else
          return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    
})(jQuery);