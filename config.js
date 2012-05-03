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