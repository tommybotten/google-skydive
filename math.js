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
