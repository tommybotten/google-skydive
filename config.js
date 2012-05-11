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
    TimeSpeedUp: 3,
    ShowAltitude: true,
    MapAutoCenter: false,
    
    CreateControls: function() {
        var that = this; // hack scoping
        
        $("#TimeSpeedUpSlider").slider({
            min: 1, 
            max: 5, 
            step: 1, 
            range: 'min',
            slide: function(event, ui) { that.TimeSpeedUpChanged(ui.value); }
        });
        $("#TimeSpeedUp").change(function() {
            that.TimeSpeedUpChanged(parseInt($(this).val()));
        });
        this.TimeSpeedUpChanged(this.TimeSpeedUp);
        
        $("#WindDirectionSlider").slider({
            min: 0, 
            max: 360, 
            step: 10, 
            slide: function(event, ui) { that.WindDirectionChanged(ui.value); }
        });
        $("#WindDirection").change(function() {
            that.WindDirectionChanged(parseInt($(this).val()));
        });
        this.WindDirectionChanged(this.WindDirection);

        $("#WindSpeedSlider").slider({
            min: 0, 
            max: 15, 
            step: 1, 
            range: 'min',
            value: this.WindSpeed, 
            slide: function(event, ui) { that.WindSpeedChanged(ui.value); }
        });
        $("#WindSpeed").change(function() {
            that.WindSpeedChanged(parseInt($(this).val()));
        });
        this.WindSpeedChanged(this.WindSpeed);
        
        $("#ParachuteSpeedSlider").slider({
            min: 0, 
            max: 15, 
            step: 1, 
            range: 'min',
            value: this.ParachuteSpeed, 
            slide: function(event, ui) { that.ParachuteSpeedChanged(ui.value); }
        });
        $("#ParachuteSpeed").change(function() {
            that.ParachuteSpeedChanged(parseInt($(this).val()));
        });
        this.ParachuteSpeedChanged(this.ParachuteSpeed);
        
        $("#DropSpeedSlider").slider({
            min: 0, 
            max: 50, 
            step: 1, 
            value: this.DropSpeed,
            range: 'min',
            value: this.DropSpeed, 
            slide: function(event, ui) { that.DropSpeedChanged(ui.value); }
        });
        $("#DropSpeed").change(function() {
            that.DropSpeedChanged(parseInt($(this).val()));
        });
        this.DropSpeedChanged(this.DropSpeed);
        
        $("#ShowAltitude").change(function() {
            that.ShowAltitudeChanged($(this).attr('checked'));
        });
        this.ShowAltitudeChanged(this.ShowAltitude);
        $("#ShowAltitude").attr('checked', this.ShowAltitude);
         
        $("#MapAutoCenter").change(function() {
            that.MapAutoCenterChanged($(this).attr('checked'));
        });
        this.MapAutoCenterChanged(this.MapAutoCenter);
        $("#MapAutoCenter").attr('checked', this.MapAutoCenter);
              
        // Disable slider keyboard binds
        $(".slider .ui-slider-handle").unbind('keydown'); 
    },
    TimeSpeedUpChanged: function(value) {
        this.TimeSpeedUp = value;
        $("#TimeSpeedUpSlider").slider("value", value);
        $("#TimeSpeedUp").val(value);
        this.SaveSettingsToLink();
    },
    WindDirectionChanged: function(value) {
        this.WindDirection = value - 180;
        $("#tuuliT").rotate({animateTo:this.WindDirection});
        $("#windArrow").rotate({animateTo:this.WindDirection});
        $("#WindDirectionSlider").slider("value", value);
        $("#WindDirection").val(value);
        this.SaveSettingsToLink();
    },
    WindSpeedChanged: function(value) {
        this.WindSpeed = value;
        $("#WindSpeedSlider").slider("value", value);
        $("#WindSpeed").val(value);
        this.SaveSettingsToLink();
    },  
    ParachuteSpeedChanged: function(value) {
        this.ParachuteSpeed = value;
        $("#ParachuteSpeedSlider").slider("value", value);
        $("#ParachuteSpeed").val(value);
        this.SaveSettingsToLink();
    },  
    DropSpeedChanged: function(value) {
        this.DropSpeed = value;
        $("#DropSpeedSlider").slider("value", value);
        $("#DropSpeed").val(value);
        this.SaveSettingsToLink();
    },
    ShowAltitudeChanged: function(value) {
        this.ShowAltitude = value;
        if (value) {
            $("#CurrentAltitude").show();
        }
        else {
            $("#CurrentAltitude").hide();
        }  
        this.SaveSettingsToLink(); 
    },
    MapAutoCenterChanged: function(value) {
        this.MapAutoCenter = value;
        this.SaveSettingsToLink(); 
    },
    LoadSettingsFromUrl: function() {
        this.MapZoom = getIntParam('MapZoom', this.MapZoom);
        this.PlaneLatitude = getFloatParam('PlaneLatitude', this.PlaneLatitude);
        this.PlaneLongitude = getFloatParam('PlaneLongitude', this.PlaneLongitude);
        this.TargetLatitude = getFloatParam('TargetLatitude', this.TargetLatitude);
        this.TargetLongitude = getFloatParam('TargetLongitude', this.TargetLongitude);
        this.WindDirection = getIntParam('WindDirection', this.WindDirection);
        this.WindSpeed = getIntParam('WindSpeed', this.WindSpeed);
        this.ParachuteSpeed = getIntParam('ParachuteSpeed', this.ParachuteSpeed);
        this.DropSpeed = getIntParam('DropSpeed', this.DropSpeed);
        this.TimeSpeedUp = getIntParam('TimeSpeedUp', this.TimeSpeedUp);
        this.ShowAltitude = getBooleanParam('ShowAltitude', this.ShowAltitude);
        this.MapAutoCenter = getBooleanParam('MapAutoCenter', this.MapAutoCenter);
    },
    SaveSettingsToLink: function() {
        var values = {
            MapZoom: this.MapZoom,
            PlaneLatitude: this.PlaneLatitude,
            PlaneLongitude: this.PlaneLongitude,
            TargetLatitude: this.TargetLatitude, 
            TargetLongitude: this.TargetLongitude,
            WindDirection: this.WindDirection + 180,
            WindSpeed: this.WindSpeed,
            ParachuteSpeed: this.ParachuteSpeed,
            DropSpeed: this.DropSpeed,
            TimeSpeedUp: this.TimeSpeedUp,
            ShowAltitude: this.ShowAltitude ? 'true' : 'false',
            MapAutoCenter: this.MapAutoCenter ? 'true' : 'false'
        };
        $('#Link').attr('href', '?' + $.param(values));
    }
}

function getIntParam(name, defaultValue) {
    var value = getRequestParameter(name);
    return (value === null) ? defaultValue : parseInt(value);
}

function getFloatParam(name, defaultValue) {
    var value = getRequestParameter(name);
    return (value === null) ? defaultValue : parseFloat(value);
}

function getBooleanParam(name, defaultValue) {
    var value = getRequestParameter(name);
    return (value === null) ? defaultValue : value === 'true';
}

function getRequestParameter(name)
{
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
        return null;
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}