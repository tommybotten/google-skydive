(function ($) {
    $(document).ready(function(){
        $(document).keydown(function(e){
            Engine.pressedKeys[e.keyCode] = true;
            
            if (e.keyCode == 38) { // up arrow
                var newSpeed = Config.ParachuteSpeed + 1;
                Config.ParachuteSpeedChanged(newSpeed <= 8 ? newSpeed : 8);
            }
            if (e.keyCode == 40) { // down arrow
                var newSpeed = Config.ParachuteSpeed - 1; 
                Config.ParachuteSpeedChanged(newSpeed >= 0 ? newSpeed : 0);
            }
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
        $("#timeSpeedUpIcon").click(function() {
            Config.TimeSpeedUpChanged(Config.TimeSpeedUp % 5 + 1 );
        });
        $("#jumpIcon").click(function() {
            if ($("#jumpIcon").hasClass('toggled')) {
                Parachute.stop();
            } else {
                Parachute.start();
            }
            $("#jumpIcon").toggleClass('toggled');
        });

        Config.LoadSettingsFromUrl();
        Config.CreateControls();
        Map.CreateMap();
        Map.CreateMarkers();
        Parachute.reset();
    });

    
    var Map = {
        CreateMap: function() {
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
        },
        CreateMarkers: function() {
            var windsockImg = document.createElement("img");
            windsockImg.src = "img/windsock.png";
            windsockImg.setAttribute("id", "windsock");
        
            this.targetMarker = new MarkerWithLabel({
                position: new google.maps.LatLng(Config.TargetLatitude, Config.TargetLongitude),
                map: this.googleMap,
                draggable: true,
                icon: "img/blank.png",
                labelContent: windsockImg,
                labelAnchor: new google.maps.Point(25, 25),
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
                Config.PlaneLatitude = that.planeMarker.getPosition().lat();
                Config.PlaneLongitude = that.planeMarker.getPosition().lng();
                var bearing = MathUtils.CalcBearingBetween(that.targetMarker.getPosition(), that.planeMarker.getPosition());
                Config.WindDirectionChanged(Math.round(bearing));
            });  
            
            google.maps.event.addListener(this.targetMarker, 'dragend', function(event) {
                Config.TargetLatitude = that.targetMarker.getPosition().lat();
                Config.TargetLongitude = that.targetMarker.getPosition().lng();
            });
            
             google.maps.event.addListenerOnce(this.googleMap, 'idle', function(){
                Config.WindDirectionChanged(Config.WindDirection + 180);
             });
            
            var pos = Map.planeMarker.getPosition();
            this.metersPerLat = 1 / MathUtils.CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat() + 1, pos.lng()));
            this.metersPerLng = 1 / MathUtils.CalcDistanceBetween(pos, new google.maps.LatLng(pos.lat(), pos.lng()+1)); 
        }
    }
    
    var Parachute = {
        reset: function() {
            this.setAltitude(Config.InitialAltitude);
            this.setHeading(Config.WindDirection);
            Map.parachuteMarker.setPosition(new google.maps.LatLng(Config.PlaneLatitude, Config.PlaneLongitude));
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

            // z-level
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
            // parachute speed           
            var dX = Math.sin(MathUtils.ToRadians(Parachute.heading)) * delta * Config.ParachuteSpeed;
            var dY = Math.cos(MathUtils.ToRadians(Parachute.heading)) * delta * Config.ParachuteSpeed;
            // wind speed
            dX += Math.sin(MathUtils.ToRadians(Config.WindDirection)) * delta * Config.WindSpeed;
            dY += Math.cos(MathUtils.ToRadians(Config.WindDirection)) * delta * Config.WindSpeed;
            // drop
            var dZ = delta * Config.DropSpeed;
            
            // apply speed up
            dX *= Config.TimeSpeedUp;
            dY *= Config.TimeSpeedUp;
            dZ *= Config.TimeSpeedUp;
            
            // handle direction
            var braking = this.pressedKeys[37] && this.pressedKeys[39];
            var turningLeft = this.pressedKeys[37] && !braking;
            var turningRight = this.pressedKeys[39] && !braking;
            
            if (turningLeft || turningRight) { 
                var rotation = delta * Config.ParachuteTurnSpeed * (turningLeft ? -1 : 1);
                Parachute.rotate(rotation);
            }
            
            if (turningLeft || turningRight) {
                // just try to simulate how turnig affects drop..
                dZ += delta * 3 * Config.DropSpeed;
            }
            
            if (braking) {
                dX *= 0.5;
                dY *= 0.5;
                dZ *= 0.5;
            }
            
            Parachute.move(dX, dY, dZ);
        }
    }    
})(jQuery);