var MathUtils = {
    CalcDistanceBetween: function(latlng1, latlng2) {
        var lat1 = latlng1.lat();
        var lon1 = latlng1.lng();
        var lat2 = latlng2.lat();
        var lon2 = latlng2.lng();
        
        var R = 6371 * 1000;
        var dLat = this.ToRadians(lat2-lat1);
        var dLon = this.ToRadians(lon2 - lon1);
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.ToRadians(lat1)) * Math.cos(this.ToRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;
        return d;
    },
    CalcBearingBetween: function (latlng1, latlng2) {
        var lat1 = latlng1.lat();
        var lon1 = latlng1.lng();
        var lat2 = latlng2.lat();
        var lon2 = latlng2.lng();
        
        var latRad1 = this.ToRadians(lat1);
        var latrad2 = this.ToRadians(lat2);
        var dLon = this.ToRadians(lon2 - lon1);

        var y = Math.sin(dLon) * Math.cos(latrad2);
        var x = Math.cos(latRad1) * Math.sin(latrad2) -
        Math.sin(latRad1) * Math.cos(latrad2) * Math.cos(dLon);
        var deg = this.ToDegrees(Math.atan2(y, x));
        return (deg >= 0) ? deg : 360 + deg;
    },
    ToRadians: function(degrees) {
        return degrees * (Math.PI / 180);
    },
    ToDegrees: function(radians) {
        return radians * 180 / Math.PI;
    }
}