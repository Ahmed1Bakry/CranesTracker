

/* Degree-minutes-seconds (& cardinal directions) separator character */
let dmsSeparator = '\u202f'; // U+202F = 'narrow no-break space'


/**
 * Functions for parsing and representing degrees / minutes / seconds.
 */
class Dms {

    // note Unicode Degree = U+00B0. Prime = U+2032, Double prime = U+2033

    /**
     * Separator character to be used to separate degrees, minutes, seconds, and cardinal directions.
     *
     * Default separator is U+202F ‘narrow no-break space’.
     *
     * To change this (e.g. to empty string or full space), set Dms.separator prior to invoking
     * formatting.
     *
     * @example
     *   import LatLon, { Dms } from '/js/geodesy/latlon-spherical.js';
     *   const p = new LatLon(51.2, 0.33).toString('dms');  // 51° 12′ 00″ N, 000° 19′ 48″ E
     *   Dms.separator = '';                                // no separator
     *   const pʹ = new LatLon(51.2, 0.33).toString('dms'); // 51°12′00″N, 000°19′48″E
     */
    static get separator()     { return dmsSeparator; }
    static set separator(char) { dmsSeparator = char; }


    /**
     * Parses string representing degrees/minutes/seconds into numeric degrees.
     *
     * This is very flexible on formats, allowing signed decimal degrees, or deg-min-sec optionally
     * suffixed by compass direction (NSEW); a variety of separators are accepted. Examples -3.62,
     * '3 37 12W', '3°37′12″W'.
     *
     * Thousands/decimal separators must be comma/dot; use Dms.fromLocale to convert locale-specific
     * thousands/decimal separators.
     *
     * @param   {string|number} dms - Degrees or deg/min/sec in variety of formats.
     * @returns {number}        Degrees as decimal number.
     *
     * @example
     *   const lat = Dms.parse('51° 28′ 40.37″ N');
     *   const lon = Dms.parse('000° 00′ 05.29″ W');
     *   const p1 = new LatLon(lat, lon); // 51.4779°N, 000.0015°W
     */
    static parse(dms) {
        // check for signed decimal degrees without NSEW, if so return it directly
        if (!isNaN(parseFloat(dms)) && isFinite(dms)) return Number(dms);

        // strip off any sign or compass dir'n & split out separate d/m/s
        const dmsParts = String(dms).trim().replace(/^-/, '').replace(/[NSEW]$/i, '').split(/[^0-9.,]+/);
        if (dmsParts[dmsParts.length-1]=='') dmsParts.splice(dmsParts.length-1);  // from trailing symbol

        if (dmsParts == '') return NaN;

        // and convert to decimal degrees...
        let deg = null;
        switch (dmsParts.length) {
            case 3:  // interpret 3-part result as d/m/s
                deg = dmsParts[0]/1 + dmsParts[1]/60 + dmsParts[2]/3600;
                break;
            case 2:  // interpret 2-part result as d/m
                deg = dmsParts[0]/1 + dmsParts[1]/60;
                break;
            case 1:  // just d (possibly decimal) or non-separated dddmmss
                deg = dmsParts[0];
                // check for fixed-width unseparated format eg 0033709W
                //if (/[NS]/i.test(dmsParts)) deg = '0' + deg;  // - normalise N/S to 3-digit degrees
                //if (/[0-9]{7}/.test(deg)) deg = deg.slice(0,3)/1 + deg.slice(3,5)/60 + deg.slice(5)/3600;
                break;
            default:
                return NaN;
        }
        if (/^-|[WS]$/i.test(dms.trim())) deg = -deg; // take '-', west and south as -ve

        return Number(deg);
    }


    /**
     * Converts decimal degrees to deg/min/sec format
     *  - degree, prime, double-prime symbols are added, but sign is discarded, though no compass
     *    direction is added.
     *  - degrees are zero-padded to 3 digits; for degrees latitude, use .slice(1) to remove leading
     *    zero.
     *
     * @private
     * @param   {number} deg - Degrees to be formatted as specified.
     * @param   {string} [format=d] - Return value as 'd', 'dm', 'dms' for deg, deg+min, deg+min+sec.
     * @param   {number} [dp=4|2|0] - Number of decimal places to use – default 4 for d, 2 for dm, 0 for dms.
     * @returns {string} Degrees formatted as deg/min/secs according to specified format.
     */
    static toDms(deg, format='d', dp=undefined) {
        if (isNaN(deg)) return null;  // give up here if we can't make a number from deg
        if (typeof deg == 'string' && deg.trim() == '') return null;
        if (typeof deg == 'boolean') return null;
        if (deg == Infinity) return null;
        if (deg == null) return null;

        // default values
        if (dp === undefined) {
            switch (format) {
                case 'd':   case 'deg':         dp = 4; break;
                case 'dm':  case 'deg+min':     dp = 2; break;
                case 'dms': case 'deg+min+sec': dp = 0; break;
                default:          format = 'd'; dp = 4; break; // be forgiving on invalid format
            }
        }

        deg = Math.abs(deg);  // (unsigned result ready for appending compass dir'n)

        let dms = null, d = null, m = null, s = null;
        switch (format) {
            default: // invalid format spec!
            case 'd': case 'deg':
                d = deg.toFixed(dp);                       // round/right-pad degrees
                if (d<100) d = '0' + d;                    // left-pad with leading zeros (note may include decimals)
                if (d<10) d = '0' + d;
                dms = d + '°';
                break;
            case 'dm': case 'deg+min':
                d = Math.floor(deg);                       // get component deg
                m = ((deg*60) % 60).toFixed(dp);           // get component min & round/right-pad
                if (m == 60) { m = (0).toFixed(dp); d++; } // check for rounding up
                d = ('000'+d).slice(-3);                   // left-pad with leading zeros
                if (m<10) m = '0' + m;                     // left-pad with leading zeros (note may include decimals)
                dms = d + '°'+Dms.separator + m + '′';
                break;
            case 'dms': case 'deg+min+sec':
                d = Math.floor(deg);                       // get component deg
                m = Math.floor((deg*3600)/60) % 60;        // get component min
                s = (deg*3600 % 60).toFixed(dp);           // get component sec & round/right-pad
                if (s == 60) { s = (0).toFixed(dp); m++; } // check for rounding up
                if (m == 60) { m = 0; d++; }               // check for rounding up
                d = ('000'+d).slice(-3);                   // left-pad with leading zeros
                m = ('00'+m).slice(-2);                    // left-pad with leading zeros
                if (s<10) s = '0' + s;                     // left-pad with leading zeros (note may include decimals)
                dms = d + '°'+Dms.separator + m + '′'+Dms.separator + s + '″';
                break;
        }

        return dms;
    }


    /**
     * Converts numeric degrees to deg/min/sec latitude (2-digit degrees, suffixed with N/S).
     *
     * @param   {number} deg - Degrees to be formatted as specified.
     * @param   {string} [format=d] - Return value as 'd', 'dm', 'dms' for deg, deg+min, deg+min+sec.
     * @param   {number} [dp=4|2|0] - Number of decimal places to use – default 4 for d, 2 for dm, 0 for dms.
     * @returns {string} Degrees formatted as deg/min/secs according to specified format.
     *
     * @example
     *   const lat = Dms.toLat(-3.62, 'dms'); // 3°37′12″S
     */
    static toLat(deg, format, dp) {
        const lat = Dms.toDms(Dms.wrap90(deg), format, dp);
        return lat===null ? '–' : lat.slice(1) + Dms.separator + (deg<0 ? 'S' : 'N');  // knock off initial '0' for lat!
    }


    /**
     * Convert numeric degrees to deg/min/sec longitude (3-digit degrees, suffixed with E/W).
     *
     * @param   {number} deg - Degrees to be formatted as specified.
     * @param   {string} [format=d] - Return value as 'd', 'dm', 'dms' for deg, deg+min, deg+min+sec.
     * @param   {number} [dp=4|2|0] - Number of decimal places to use – default 4 for d, 2 for dm, 0 for dms.
     * @returns {string} Degrees formatted as deg/min/secs according to specified format.
     *
     * @example
     *   const lon = Dms.toLon(-3.62, 'dms'); // 3°37′12″W
     */
    static toLon(deg, format, dp) {
        const lon = Dms.toDms(Dms.wrap180(deg), format, dp);
        return lon===null ? '–' : lon + Dms.separator + (deg<0 ? 'W' : 'E');
    }


    /**
     * Converts numeric degrees to deg/min/sec as a bearing (0°..360°).
     *
     * @param   {number} deg - Degrees to be formatted as specified.
     * @param   {string} [format=d] - Return value as 'd', 'dm', 'dms' for deg, deg+min, deg+min+sec.
     * @param   {number} [dp=4|2|0] - Number of decimal places to use – default 4 for d, 2 for dm, 0 for dms.
     * @returns {string} Degrees formatted as deg/min/secs according to specified format.
     *
     * @example
     *   const lon = Dms.toBrng(-3.62, 'dms'); // 356°22′48″
     */
    static toBrng(deg, format, dp) {
        const brng =  Dms.toDms(Dms.wrap360(deg), format, dp);
        return brng===null ? '–' : brng.replace('360', '0');  // just in case rounding took us up to 360°!
    }


    /**
     * Converts DMS string from locale thousands/decimal separators to JavaScript comma/dot separators
     * for subsequent parsing.
     *
     * Both thousands and decimal separators must be followed by a numeric character, to facilitate
     * parsing of single lat/long string (in which whitespace must be left after the comma separator).
     *
     * @param   {string} str - Degrees/minutes/seconds formatted with locale separators.
     * @returns {string} Degrees/minutes/seconds formatted with standard Javascript separators.
     *
     * @example
     *   const lat = Dms.fromLocale('51°28′40,12″N');                          // '51°28′40.12″N' in France
     *   const p = new LatLon(Dms.fromLocale('51°28′40,37″N, 000°00′05,29″W'); // '51.4779°N, 000.0015°W' in France
     */
    static fromLocale(str) {
        const locale = (123456.789).toLocaleString();
        const separator = { thousands: locale.slice(3, 4), decimal: locale.slice(7, 8) };
        return str.replace(separator.thousands, '⁜').replace(separator.decimal, '.').replace('⁜', ',');
    }


    /**
     * Converts DMS string from JavaScript comma/dot thousands/decimal separators to locale separators.
     *
     * Can also be used to format standard numbers such as distances.
     *
     * @param   {string} str - Degrees/minutes/seconds formatted with standard Javascript separators.
     * @returns {string} Degrees/minutes/seconds formatted with locale separators.
     *
     * @example
     *   const Dms.toLocale('123,456.789');                   // '123.456,789' in France
     *   const Dms.toLocale('51°28′40.12″N, 000°00′05.31″W'); // '51°28′40,12″N, 000°00′05,31″W' in France
     */
    static toLocale(str) {
        const locale = (123456.789).toLocaleString();
        const separator = { thousands: locale.slice(3, 4), decimal: locale.slice(7, 8) };
        return str.replace(/,([0-9])/, '⁜$1').replace('.', separator.decimal).replace('⁜', separator.thousands);
    }


    /**
     * Returns compass point (to given precision) for supplied bearing.
     *
     * @param   {number} bearing - Bearing in degrees from north.
     * @param   {number} [precision=3] - Precision (1:cardinal / 2:intercardinal / 3:secondary-intercardinal).
     * @returns {string} Compass point for supplied bearing.
     *
     * @example
     *   const point = Dms.compassPoint(24);    // point = 'NNE'
     *   const point = Dms.compassPoint(24, 1); // point = 'N'
     */
    static compassPoint(bearing, precision=3) {
        if (![ 1, 2, 3 ].includes(Number(precision))) throw new RangeError(`invalid precision ‘${precision}’`);
        // note precision could be extended to 4 for quarter-winds (eg NbNW), but I think they are little used

        bearing = Dms.wrap360(bearing); // normalise to range 0..360°

        const cardinals = [
            'N', 'NNE', 'NE', 'ENE',
            'E', 'ESE', 'SE', 'SSE',
            'S', 'SSW', 'SW', 'WSW',
            'W', 'WNW', 'NW', 'NNW' ];
        const n = 4 * 2**(precision-1); // no of compass points at req’d precision (1=>4, 2=>8, 3=>16)
        const cardinal = cardinals[Math.round(bearing*n/360)%n * 16/n];

        return cardinal;
    }


    /**
     * Constrain degrees to range -90..+90 (for latitude); e.g. -91 => -89, 91 => 89.
     *
     * @private
     * @param {number} degrees
     * @returns degrees within range -90..+90.
     */
    static wrap90(degrees) {
        if (-90<=degrees && degrees<=90) return degrees; // avoid rounding due to arithmetic ops if within range

        // latitude wrapping requires a triangle wave function; a general triangle wave is
        //     f(x) = 4a/p ⋅ | (x-p/4)%p - p/2 | - a
        // where a = amplitude, p = period, % = modulo; however, JavaScript '%' is a remainder operator
        // not a modulo operator - for modulo, replace 'x%n' with '((x%n)+n)%n'
        const x = degrees, a = 90, p = 360;
        return 4*a/p * Math.abs((((x-p/4)%p)+p)%p - p/2) - a;
    }

    /**
     * Constrain degrees to range -180..+180 (for longitude); e.g. -181 => 179, 181 => -179.
     *
     * @private
     * @param {number} degrees
     * @returns degrees within range -180..+180.
     */
    static wrap180(degrees) {
        if (-180<=degrees && degrees<=180) return degrees; // avoid rounding due to arithmetic ops if within range

        // longitude wrapping requires a sawtooth wave function; a general sawtooth wave is
        //     f(x) = (2ax/p - p/2) % p - a
        // where a = amplitude, p = period, % = modulo; however, JavaScript '%' is a remainder operator
        // not a modulo operator - for modulo, replace 'x%n' with '((x%n)+n)%n'
        const x = degrees, a = 180, p = 360;
        return (((2*a*x/p - p/2)%p)+p)%p - a;
    }

    /**
     * Constrain degrees to range 0..360 (for bearings); e.g. -1 => 359, 361 => 1.
     *
     * @private
     * @param {number} degrees
     * @returns degrees within range 0..360.
     */
    static wrap360(degrees) {
        if (0<=degrees && degrees<360) return degrees; // avoid rounding due to arithmetic ops if within range

        // bearing wrapping requires a sawtooth wave function with a vertical offset equal to the
        // amplitude and a corresponding phase shift; this changes the general sawtooth wave function from
        //     f(x) = (2ax/p - p/2) % p - a
        // to
        //     f(x) = (2ax/p) % p
        // where a = amplitude, p = period, % = modulo; however, JavaScript '%' is a remainder operator
        // not a modulo operator - for modulo, replace 'x%n' with '((x%n)+n)%n'
        const x = degrees, a = 180, p = 360;
        return (((2*a*x/p)%p)+p)%p;
    }

}


// Extend Number object with methods to convert between degrees & radians
Number.prototype.toRadians = function() { return this * Math.PI / 180; };
Number.prototype.toDegrees = function() { return this * 180 / Math.PI; };

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

class LatLonSpherical {

    /**
     * Creates a latitude/longitude point on the earth’s surface, using a spherical model earth.
     *
     * @param  {number} lat - Latitude (in degrees).
     * @param  {number} lon - Longitude (in degrees).
     * @throws {TypeError} Invalid lat/lon.
     *
     * @example
     *   import LatLon from '/js/geodesy/latlon-spherical.js';
     *   const p = new LatLon(52.205, 0.119);
     */
    constructor(lat, lon) {
        if (isNaN(lat)) throw new TypeError(`invalid lat ‘${lat}’`);
        if (isNaN(lon)) throw new TypeError(`invalid lon ‘${lon}’`);

        this._lat = Dms.wrap90(Number(lat));
        this._lon = Dms.wrap180(Number(lon));
    }


    /**
     * Latitude in degrees north from equator (including aliases lat, latitude): can be set as
     * numeric or hexagesimal (deg-min-sec); returned as numeric.
     */
    get lat()       { return this._lat; }
    get latitude()  { return this._lat; }
    set lat(lat) {
        this._lat = isNaN(lat) ? Dms.wrap90(Dms.parse(lat)) : Dms.wrap90(Number(lat));
        if (isNaN(this._lat)) throw new TypeError(`invalid lat ‘${lat}’`);
    }
    set latitude(lat) {
        this._lat = isNaN(lat) ? Dms.wrap90(Dms.parse(lat)) : Dms.wrap90(Number(lat));
        if (isNaN(this._lat)) throw new TypeError(`invalid latitude ‘${lat}’`);
    }

    /**
     * Longitude in degrees east from international reference meridian (including aliases lon, lng,
     * longitude): can be set as numeric or hexagesimal (deg-min-sec); returned as numeric.
     */
    get lon()       { return this._lon; }
    get lng()       { return this._lon; }
    get longitude() { return this._lon; }
    set lon(lon) {
        this._lon = isNaN(lon) ? Dms.wrap180(Dms.parse(lon)) : Dms.wrap180(Number(lon));
        if (isNaN(this._lon)) throw new TypeError(`invalid lon ‘${lon}’`);
    }
    set lng(lon) {
        this._lon = isNaN(lon) ? Dms.wrap180(Dms.parse(lon)) : Dms.wrap180(Number(lon));
        if (isNaN(this._lon)) throw new TypeError(`invalid lng ‘${lon}’`);
    }
    set longitude(lon) {
        this._lon = isNaN(lon) ? Dms.wrap180(Dms.parse(lon)) : Dms.wrap180(Number(lon));
        if (isNaN(this._lon)) throw new TypeError(`invalid longitude ‘${lon}’`);
    }


    /** Conversion factors; 1000 * LatLon.metresToKm gives 1. */
    static get metresToKm()            { return 1/1000; }
    /** Conversion factors; 1000 * LatLon.metresToMiles gives 0.621371192237334. */
    static get metresToMiles()         { return 1/1609.344; }
    /** Conversion factors; 1000 * LatLon.metresToMiles gives 0.5399568034557236. */
    static get metresToNauticalMiles() { return 1/1852; }


    /**
     * Parses a latitude/longitude point from a variety of formats.
     *
     * Latitude & longitude (in degrees) can be supplied as two separate parameters, as a single
     * comma-separated lat/lon string, or as a single object with { lat, lon } or GeoJSON properties.
     *
     * The latitude/longitude values may be numeric or strings; they may be signed decimal or
     * deg-min-sec (hexagesimal) suffixed by compass direction (NSEW); a variety of separators are
     * accepted. Examples -3.62, '3 37 12W', '3°37′12″W'.
     *
     * Thousands/decimal separators must be comma/dot; use Dms.fromLocale to convert locale-specific
     * thousands/decimal separators.
     *
     * @param   {number|string|Object} lat|latlon - Latitude (in degrees) or comma-separated lat/lon or lat/lon object.
     * @param   {number|string}        [lon]      - Longitude (in degrees).
     * @returns {LatLon} Latitude/longitude point.
     * @throws  {TypeError} Invalid point.
     *
     * @example
     *   const p1 = LatLon.parse(52.205, 0.119);                                    // numeric pair (≡ new LatLon)
     *   const p2 = LatLon.parse('52.205', '0.119');                                // numeric string pair (≡ new LatLon)
     *   const p3 = LatLon.parse('52.205, 0.119');                                  // single string numerics
     *   const p4 = LatLon.parse('52°12′18.0″N', '000°07′08.4″E');                  // DMS pair
     *   const p5 = LatLon.parse('52°12′18.0″N, 000°07′08.4″E');                    // single string DMS
     *   const p6 = LatLon.parse({ lat: 52.205, lon: 0.119 });                      // { lat, lon } object numeric
     *   const p7 = LatLon.parse({ lat: '52°12′18.0″N', lng: '000°07′08.4″E' });    // { lat, lng } object DMS
     *   const p8 = LatLon.parse({ type: 'Point', coordinates: [ 0.119, 52.205] }); // GeoJSON
     */
    static parse(...args) {
        if (args.length == 0) throw new TypeError('invalid (empty) point');
        if (args[0]===null || args[1]===null) throw new TypeError('invalid (null) point');

        let lat=undefined, lon=undefined;

        if (args.length == 2) { // regular (lat, lon) arguments
            [ lat, lon ] = args;
            lat = Dms.wrap90(Dms.parse(lat));
            lon = Dms.wrap180(Dms.parse(lon));
            if (isNaN(lat) || isNaN(lon)) throw new TypeError(`invalid point ‘${args.toString()}’`);
        }

        if (args.length == 1 && typeof args[0] == 'string') { // single comma-separated lat,lon string
            [ lat, lon ] = args[0].split(',');
            lat = Dms.wrap90(Dms.parse(lat));
            lon = Dms.wrap180(Dms.parse(lon));
            if (isNaN(lat) || isNaN(lon)) throw new TypeError(`invalid point ‘${args[0]}’`);
        }

        if (args.length == 1 && typeof args[0] == 'object') { // single { lat, lon } object
            const ll = args[0];
            if (ll.type == 'Point' && Array.isArray(ll.coordinates)) { // GeoJSON
                [ lon, lat ] = ll.coordinates;
            } else { // regular { lat, lon } object
                if (ll.latitude  != undefined) lat = ll.latitude;
                if (ll.lat       != undefined) lat = ll.lat;
                if (ll.longitude != undefined) lon = ll.longitude;
                if (ll.lng       != undefined) lon = ll.lng;
                if (ll.lon       != undefined) lon = ll.lon;
                lat = Dms.wrap90(Dms.parse(lat));
                lon = Dms.wrap180(Dms.parse(lon));
            }
            if (isNaN(lat) || isNaN(lon)) throw new TypeError(`invalid point ‘${JSON.stringify(args[0])}’`);
        }

        if (isNaN(lat) || isNaN(lon)) throw new TypeError(`invalid point ‘${args.toString()}’`);

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns the distance along the surface of the earth from ‘this’ point to destination point.
     *
     * Uses haversine formula: a = sin²(Δφ/2) + cosφ1·cosφ2 · sin²(Δλ/2); d = 2 · atan2(√a, √(a-1)).
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @param   {number} [radius=6371e3] - Radius of earth (defaults to mean radius in metres).
     * @returns {number} Distance between this point and destination point, in same units as radius.
     * @throws  {TypeError} Invalid radius.
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(48.857, 2.351);
     *   const d = p1.distanceTo(p2);       // 404.3×10³ m
     *   const m = p1.distanceTo(p2, 3959); // 251.2 miles
     */
    distanceTo(point, radius=6371e3) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms
        if (isNaN(radius)) throw new TypeError(`invalid radius ‘${radius}’`);

        // a = sin²(Δφ/2) + cos(φ1)⋅cos(φ2)⋅sin²(Δλ/2)
        // δ = 2·atan2(√(a), √(1−a))
        // see mathforum.org/library/drmath/view/51879.html for derivation

        const R = radius;
        const φ1 = this.lat.toRadians(),  λ1 = this.lon.toRadians();
        const φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();
        const Δφ = φ2 - φ1;
        const Δλ = λ2 - λ1;

        const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2) * Math.sin(Δλ/2)*Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;

        return d;
    }


    /**
     * Returns the initial bearing from ‘this’ point to destination point.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @returns {number} Initial bearing in degrees from north (0°..360°).
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(48.857, 2.351);
     *   const b1 = p1.initialBearingTo(p2); // 156.2°
     */
    initialBearingTo(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms
        if (this.equals(point)) return NaN; // coincident points

        // tanθ = sinΔλ⋅cosφ2 / cosφ1⋅sinφ2 − sinφ1⋅cosφ2⋅cosΔλ
        // see mathforum.org/library/drmath/view/55417.html for derivation

        const φ1 = this.lat.toRadians();
        const φ2 = point.lat.toRadians();
        const Δλ = (point.lon - this.lon).toRadians();

        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const θ = Math.atan2(y, x);

        const bearing = θ.toDegrees();

        return Dms.wrap360(bearing);
    }


    /**
     * Returns final bearing arriving at destination point from ‘this’ point; the final bearing will
     * differ from the initial bearing by varying degrees according to distance and latitude.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @returns {number} Final bearing in degrees from north (0°..360°).
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(48.857, 2.351);
     *   const b2 = p1.finalBearingTo(p2); // 157.9°
     */
    finalBearingTo(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms

        // get initial bearing from destination point to this point & reverse it by adding 180°

        const bearing = point.initialBearingTo(this) + 180;

        return Dms.wrap360(bearing);
    }


    /**
     * Returns the midpoint between ‘this’ point and destination point.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @returns {LatLon} Midpoint between this point and destination point.
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(48.857, 2.351);
     *   const pMid = p1.midpointTo(p2); // 50.5363°N, 001.2746°E
     */
    midpointTo(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms

        // φm = atan2( sinφ1 + sinφ2, √( (cosφ1 + cosφ2⋅cosΔλ)² + cos²φ2⋅sin²Δλ ) )
        // λm = λ1 + atan2(cosφ2⋅sinΔλ, cosφ1 + cosφ2⋅cosΔλ)
        // midpoint is sum of vectors to two points: mathforum.org/library/drmath/view/51822.html

        const φ1 = this.lat.toRadians();
        const λ1 = this.lon.toRadians();
        const φ2 = point.lat.toRadians();
        const Δλ = (point.lon - this.lon).toRadians();

        // get cartesian coordinates for the two points
        const A = { x: Math.cos(φ1), y: 0, z: Math.sin(φ1) }; // place point A on prime meridian y=0
        const B = { x: Math.cos(φ2)*Math.cos(Δλ), y: Math.cos(φ2)*Math.sin(Δλ), z: Math.sin(φ2) };

        // vector to midpoint is sum of vectors to two points (no need to normalise)
        const C = { x: A.x + B.x, y: A.y + B.y, z: A.z + B.z };

        const φm = Math.atan2(C.z, Math.sqrt(C.x*C.x + C.y*C.y));
        const λm = λ1 + Math.atan2(C.y, C.x);

        const lat = φm.toDegrees();
        const lon = λm.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns the point at given fraction between ‘this’ point and given point.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @param   {number} fraction - Fraction between the two points (0 = this point, 1 = specified point).
     * @returns {LatLon} Intermediate point between this point and destination point.
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(48.857, 2.351);
     *   const pInt = p1.intermediatePointTo(p2, 0.25); // 51.3721°N, 000.7073°E
     */
    intermediatePointTo(point, fraction) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms
        if (this.equals(point)) return new LatLonSpherical(this.lat, this.lon); // coincident points

        const φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();
        const φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();

        // distance between points
        const Δφ = φ2 - φ1;
        const Δλ = λ2 - λ1;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2)
            + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const A = Math.sin((1-fraction)*δ) / Math.sin(δ);
        const B = Math.sin(fraction*δ) / Math.sin(δ);

        const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
        const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
        const z = A * Math.sin(φ1) + B * Math.sin(φ2);

        const φ3 = Math.atan2(z, Math.sqrt(x*x + y*y));
        const λ3 = Math.atan2(y, x);

        const lat = φ3.toDegrees();
        const lon = λ3.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns the destination point from ‘this’ point having travelled the given distance on the
     * given initial bearing (bearing normally varies around path followed).
     *
     * @param   {number} distance - Distance travelled, in same units as earth radius (default: metres).
     * @param   {number} bearing - Initial bearing in degrees from north.
     * @param   {number} [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {LatLon} Destination point.
     *
     * @example
     *   const p1 = new LatLon(51.47788, -0.00147);
     *   const p2 = p1.destinationPoint(7794, 300.7); // 51.5136°N, 000.0983°W
     */
    destinationPoint(distance, bearing, radius=6371e3) {
        // sinφ2 = sinφ1⋅cosδ + cosφ1⋅sinδ⋅cosθ
        // tanΔλ = sinθ⋅sinδ⋅cosφ1 / cosδ−sinφ1⋅sinφ2
        // see mathforum.org/library/drmath/view/52049.html for derivation

        const δ = distance / radius; // angular distance in radians
        const θ = Number(bearing).toRadians();

        const φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();

        const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
        const φ2 = Math.asin(sinφ2);
        const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
        const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
        const λ2 = λ1 + Math.atan2(y, x);

        const lat = φ2.toDegrees();
        const lon = λ2.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns the point of intersection of two paths defined by point and bearing.
     *
     * @param   {LatLon}      p1 - First point.
     * @param   {number}      brng1 - Initial bearing from first point.
     * @param   {LatLon}      p2 - Second point.
     * @param   {number}      brng2 - Initial bearing from second point.
     * @returns {LatLon|null} Destination point (null if no unique intersection defined).
     *
     * @example
     *   const p1 = new LatLon(51.8853, 0.2545), brng1 = 108.547;
     *   const p2 = new LatLon(49.0034, 2.5735), brng2 =  32.435;
     *   const pInt = LatLon.intersection(p1, brng1, p2, brng2); // 50.9078°N, 004.5084°E
     */
    static intersection(p1, brng1, p2, brng2) {
        if (!(p1 instanceof LatLonSpherical)) p1 = LatLonSpherical.parse(p1); // allow literal forms
        if (!(p2 instanceof LatLonSpherical)) p2 = LatLonSpherical.parse(p2); // allow literal forms
        if (isNaN(brng1)) throw new TypeError(`invalid brng1 ‘${brng1}’`);
        if (isNaN(brng2)) throw new TypeError(`invalid brng2 ‘${brng2}’`);

        // see www.edwilliams.org/avform.htm#Intersection

        const φ1 = p1.lat.toRadians(), λ1 = p1.lon.toRadians();
        const φ2 = p2.lat.toRadians(), λ2 = p2.lon.toRadians();
        const θ13 = Number(brng1).toRadians(), θ23 = Number(brng2).toRadians();
        const Δφ = φ2 - φ1, Δλ = λ2 - λ1;

        // angular distance p1-p2
        const δ12 = 2 * Math.asin(Math.sqrt(Math.sin(Δφ/2) * Math.sin(Δφ/2)
            + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2)));
        if (Math.abs(δ12) < Number.EPSILON) return new LatLonSpherical(p1.lat, p1.lon); // coincident points

        // initial/final bearings between points
        const cosθa = (Math.sin(φ2) - Math.sin(φ1)*Math.cos(δ12)) / (Math.sin(δ12)*Math.cos(φ1));
        const cosθb = (Math.sin(φ1) - Math.sin(φ2)*Math.cos(δ12)) / (Math.sin(δ12)*Math.cos(φ2));
        const θa = Math.acos(Math.min(Math.max(cosθa, -1), 1)); // protect against rounding errors
        const θb = Math.acos(Math.min(Math.max(cosθb, -1), 1)); // protect against rounding errors

        const θ12 = Math.sin(λ2-λ1)>0 ? θa : 2*π-θa;
        const θ21 = Math.sin(λ2-λ1)>0 ? 2*π-θb : θb;

        const α1 = θ13 - θ12; // angle 2-1-3
        const α2 = θ21 - θ23; // angle 1-2-3

        if (Math.sin(α1) == 0 && Math.sin(α2) == 0) return null; // infinite intersections
        if (Math.sin(α1) * Math.sin(α2) < 0) return null;        // ambiguous intersection (antipodal/360°)

        const cosα3 = -Math.cos(α1)*Math.cos(α2) + Math.sin(α1)*Math.sin(α2)*Math.cos(δ12);

        const δ13 = Math.atan2(Math.sin(δ12)*Math.sin(α1)*Math.sin(α2), Math.cos(α2) + Math.cos(α1)*cosα3);

        const φ3 = Math.asin(Math.min(Math.max(Math.sin(φ1)*Math.cos(δ13) + Math.cos(φ1)*Math.sin(δ13)*Math.cos(θ13), -1), 1));

        const Δλ13 = Math.atan2(Math.sin(θ13)*Math.sin(δ13)*Math.cos(φ1), Math.cos(δ13) - Math.sin(φ1)*Math.sin(φ3));
        const λ3 = λ1 + Δλ13;

        const lat = φ3.toDegrees();
        const lon = λ3.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns (signed) distance from ‘this’ point to great circle defined by start-point and
     * end-point.
     *
     * @param   {LatLon} pathStart - Start point of great circle path.
     * @param   {LatLon} pathEnd - End point of great circle path.
     * @param   {number} [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {number} Distance to great circle (-ve if to left, +ve if to right of path).
     *
     * @example
     *   const pCurrent = new LatLon(53.2611, -0.7972);
     *   const p1 = new LatLon(53.3206, -1.7297);
     *   const p2 = new LatLon(53.1887, 0.1334);
     *   const d = pCurrent.crossTrackDistanceTo(p1, p2);  // -307.5 m
     */
    crossTrackDistanceTo(pathStart, pathEnd, radius=6371e3) {
        if (!(pathStart instanceof LatLonSpherical)) pathStart = LatLonSpherical.parse(pathStart); // allow literal forms
        if (!(pathEnd instanceof LatLonSpherical)) pathEnd = LatLonSpherical.parse(pathEnd);       // allow literal forms
        const R = radius;

        if (this.equals(pathStart)) return 0;

        const δ13 = pathStart.distanceTo(this, R) / R;
        const θ13 = pathStart.initialBearingTo(this).toRadians();
        const θ12 = pathStart.initialBearingTo(pathEnd).toRadians();

        const δxt = Math.asin(Math.sin(δ13) * Math.sin(θ13 - θ12));

        return δxt * R;
    }


    /**
     * Returns how far ‘this’ point is along a path from from start-point, heading towards end-point.
     * That is, if a perpendicular is drawn from ‘this’ point to the (great circle) path, the
     * along-track distance is the distance from the start point to where the perpendicular crosses
     * the path.
     *
     * @param   {LatLon} pathStart - Start point of great circle path.
     * @param   {LatLon} pathEnd - End point of great circle path.
     * @param   {number} [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {number} Distance along great circle to point nearest ‘this’ point.
     *
     * @example
     *   const pCurrent = new LatLon(53.2611, -0.7972);
     *   const p1 = new LatLon(53.3206, -1.7297);
     *   const p2 = new LatLon(53.1887,  0.1334);
     *   const d = pCurrent.alongTrackDistanceTo(p1, p2);  // 62.331 km
     */
    alongTrackDistanceTo(pathStart, pathEnd, radius=6371e3) {
        if (!(pathStart instanceof LatLonSpherical)) pathStart = LatLonSpherical.parse(pathStart); // allow literal forms
        if (!(pathEnd instanceof LatLonSpherical)) pathEnd = LatLonSpherical.parse(pathEnd);       // allow literal forms
        const R = radius;

        if (this.equals(pathStart)) return 0;

        const δ13 = pathStart.distanceTo(this, R) / R;
        const θ13 = pathStart.initialBearingTo(this).toRadians();
        const θ12 = pathStart.initialBearingTo(pathEnd).toRadians();

        const δxt = Math.asin(Math.sin(δ13) * Math.sin(θ13-θ12));

        const δat = Math.acos(Math.cos(δ13) / Math.abs(Math.cos(δxt)));

        return δat*Math.sign(Math.cos(θ12-θ13)) * R;
    }


    /**
     * Returns maximum latitude reached when travelling on a great circle on given bearing from
     * ‘this’ point (‘Clairaut’s formula’). Negate the result for the minimum latitude (in the
     * southern hemisphere).
     *
     * The maximum latitude is independent of longitude; it will be the same for all points on a
     * given latitude.
     *
     * @param   {number} bearing - Initial bearing.
     * @returns {number} Maximum latitude reached.
     */
    maxLatitude(bearing) {
        const θ = Number(bearing).toRadians();

        const φ = this.lat.toRadians();

        const φMax = Math.acos(Math.abs(Math.sin(θ) * Math.cos(φ)));

        return φMax.toDegrees();
    }


    /**
     * Returns the pair of meridians at which a great circle defined by two points crosses the given
     * latitude. If the great circle doesn't reach the given latitude, null is returned.
     *
     * @param   {LatLon}      point1 - First point defining great circle.
     * @param   {LatLon}      point2 - Second point defining great circle.
     * @param   {number}      latitude - Latitude crossings are to be determined for.
     * @returns {Object|null} Object containing { lon1, lon2 } or null if given latitude not reached.
     */
    static crossingParallels(point1, point2, latitude) {
        if (point1.equals(point2)) return null; // coincident points

        const φ = Number(latitude).toRadians();

        const φ1 = point1.lat.toRadians();
        const λ1 = point1.lon.toRadians();
        const φ2 = point2.lat.toRadians();
        const λ2 = point2.lon.toRadians();

        const Δλ = λ2 - λ1;

        const x = Math.sin(φ1) * Math.cos(φ2) * Math.cos(φ) * Math.sin(Δλ);
        const y = Math.sin(φ1) * Math.cos(φ2) * Math.cos(φ) * Math.cos(Δλ) - Math.cos(φ1) * Math.sin(φ2) * Math.cos(φ);
        const z = Math.cos(φ1) * Math.cos(φ2) * Math.sin(φ) * Math.sin(Δλ);

        if (z * z > x * x + y * y) return null; // great circle doesn't reach latitude

        const λm = Math.atan2(-y, x);               // longitude at max latitude
        const Δλi = Math.acos(z / Math.sqrt(x*x + y*y)); // Δλ from λm to intersection points

        const λi1 = λ1 + λm - Δλi;
        const λi2 = λ1 + λm + Δλi;

        const lon1 = λi1.toDegrees();
        const lon2 = λi2.toDegrees();

        return {
            lon1: Dms.wrap180(lon1),
            lon2: Dms.wrap180(lon2),
        };
    }


    /* Rhumb - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * Returns the distance travelling from ‘this’ point to destination point along a rhumb line.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @param   {number} [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {number} Distance in km between this point and destination point (same units as radius).
     *
     * @example
     *   const p1 = new LatLon(51.127, 1.338);
     *   const p2 = new LatLon(50.964, 1.853);
     *   const d = p1.distanceTo(p2); //  40.31 km
     */
    rhumbDistanceTo(point, radius=6371e3) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms

        // see www.edwilliams.org/avform.htm#Rhumb

        const R = radius;
        const φ1 = this.lat.toRadians();
        const φ2 = point.lat.toRadians();
        const Δφ = φ2 - φ1;
        let Δλ = Math.abs(point.lon - this.lon).toRadians();
        // if dLon over 180° take shorter rhumb line across the anti-meridian:
        if (Math.abs(Δλ) > π) Δλ = Δλ > 0 ? -(2 * π - Δλ) : (2 * π + Δλ);

        // on Mercator projection, longitude distances shrink by latitude; q is the 'stretch factor'
        // q becomes ill-conditioned along E-W line (0/0); use empirical tolerance to avoid it (note ε is too small)
        const Δψ = Math.log(Math.tan(φ2 / 2 + π / 4) / Math.tan(φ1 / 2 + π / 4));
        const q = Math.abs(Δψ) > 10e-12 ? Δφ / Δψ : Math.cos(φ1);

        // distance is pythagoras on 'stretched' Mercator projection, √(Δφ² + q²·Δλ²)
        const δ = Math.sqrt(Δφ*Δφ + q*q * Δλ*Δλ); // angular distance in radians
        const d = δ * R;

        return d;
    }


    /**
     * Returns the bearing from ‘this’ point to destination point along a rhumb line.
     *
     * @param   {LatLon}    point - Latitude/longitude of destination point.
     * @returns {number}    Bearing in degrees from north.
     *
     * @example
     *   const p1 = new LatLon(51.127, 1.338);
     *   const p2 = new LatLon(50.964, 1.853);
     *   const d = p1.rhumbBearingTo(p2); // 116.7°
     */
    rhumbBearingTo(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms
        if (this.equals(point)) return NaN; // coincident points

        const φ1 = this.lat.toRadians();
        const φ2 = point.lat.toRadians();
        let Δλ = (point.lon - this.lon).toRadians();
        // if dLon over 180° take shorter rhumb line across the anti-meridian:
        if (Math.abs(Δλ) > π) Δλ = Δλ > 0 ? -(2 * π - Δλ) : (2 * π + Δλ);

        const Δψ = Math.log(Math.tan(φ2 / 2 + π / 4) / Math.tan(φ1 / 2 + π / 4));

        const θ = Math.atan2(Δλ, Δψ);

        const bearing = θ.toDegrees();

        return Dms.wrap360(bearing);
    }


    /**
     * Returns the destination point having travelled along a rhumb line from ‘this’ point the given
     * distance on the given bearing.
     *
     * @param   {number} distance - Distance travelled, in same units as earth radius (default: metres).
     * @param   {number} bearing - Bearing in degrees from north.
     * @param   {number} [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {LatLon} Destination point.
     *
     * @example
     *   const p1 = new LatLon(51.127, 1.338);
     *   const p2 = p1.rhumbDestinationPoint(40300, 116.7); // 50.9642°N, 001.8530°E
     */
    rhumbDestinationPoint(distance, bearing, radius=6371e3) {
        const φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();
        const θ = Number(bearing).toRadians();

        const δ = distance / radius; // angular distance in radians

        const Δφ = δ * Math.cos(θ);
        let φ2 = φ1 + Δφ;

        // check for some daft bugger going past the pole, normalise latitude if so
        if (Math.abs(φ2) > π / 2) φ2 = φ2 > 0 ? π - φ2 : -π - φ2;

        const Δψ = Math.log(Math.tan(φ2 / 2 + π / 4) / Math.tan(φ1 / 2 + π / 4));
        const q = Math.abs(Δψ) > 10e-12 ? Δφ / Δψ : Math.cos(φ1); // E-W course becomes ill-conditioned with 0/0

        const Δλ = δ * Math.sin(θ) / q;
        const λ2 = λ1 + Δλ;

        const lat = φ2.toDegrees();
        const lon = λ2.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /**
     * Returns the loxodromic midpoint (along a rhumb line) between ‘this’ point and second point.
     *
     * @param   {LatLon} point - Latitude/longitude of second point.
     * @returns {LatLon} Midpoint between this point and second point.
     *
     * @example
     *   const p1 = new LatLon(51.127, 1.338);
     *   const p2 = new LatLon(50.964, 1.853);
     *   const pMid = p1.rhumbMidpointTo(p2); // 51.0455°N, 001.5957°E
     */
    rhumbMidpointTo(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms

        // see mathforum.org/kb/message.jspa?messageID=148837

        const φ1 = this.lat.toRadians(); let λ1 = this.lon.toRadians();
        const φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();

        if (Math.abs(λ2 - λ1) > π) λ1 += 2 * π; // crossing anti-meridian

        const φ3 = (φ1 + φ2) / 2;
        const f1 = Math.tan(π / 4 + φ1 / 2);
        const f2 = Math.tan(π / 4 + φ2 / 2);
        const f3 = Math.tan(π / 4 + φ3 / 2);
        let λ3 = ((λ2 - λ1) * Math.log(f3) + λ1 * Math.log(f2) - λ2 * Math.log(f1)) / Math.log(f2 / f1);

        if (!isFinite(λ3)) λ3 = (λ1 + λ2) / 2; // parallel of latitude

        const lat = φ3.toDegrees();
        const lon = λ3.toDegrees();

        return new LatLonSpherical(lat, lon);
    }


    /* Area - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */


    /**
     * Calculates the area of a spherical polygon where the sides of the polygon are great circle
     * arcs joining the vertices.
     *
     * @param   {LatLon[]} polygon - Array of points defining vertices of the polygon.
     * @param   {number}   [radius=6371e3] - (Mean) radius of earth (defaults to radius in metres).
     * @returns {number}   The area of the polygon in the same units as radius.
     *
     * @example
     *   const polygon = [new LatLon(0,0), new LatLon(1,0), new LatLon(0,1)];
     *   const area = LatLon.areaOf(polygon); // 6.18e9 m²
     */
    static areaOf(polygon, radius=6371e3) {
        // uses method due to Karney: osgeo-org.1560.x6.nabble.com/Area-of-a-spherical-polygon-td3841625.html;
        // for each edge of the polygon, tan(E/2) = tan(Δλ/2)·(tan(φ₁/2)+tan(φ₂/2)) / (1+tan(φ₁/2)·tan(φ₂/2))
        // where E is the spherical excess of the trapezium obtained by extending the edge to the equator
        // (Karney's method is probably more efficient than the more widely known L’Huilier’s Theorem)

        const R = radius;

        // close polygon so that last point equals first point
        const closed = polygon[0].equals(polygon[polygon.length-1]);
        if (!closed) polygon.push(polygon[0]);

        const nVertices = polygon.length - 1;

        let S = 0; // spherical excess in steradians
        for (let v=0; v<nVertices; v++) {
            const φ1 = polygon[v].lat.toRadians();
            const φ2 = polygon[v+1].lat.toRadians();
            const Δλ = (polygon[v+1].lon - polygon[v].lon).toRadians();
            const E = 2 * Math.atan2(Math.tan(Δλ/2) * (Math.tan(φ1/2)+Math.tan(φ2/2)), 1 + Math.tan(φ1/2)*Math.tan(φ2/2));
            S += E;
        }

        if (isPoleEnclosedBy(polygon)) S = Math.abs(S) - 2*π;

        const A = Math.abs(S * R*R); // area in units of R

        if (!closed) polygon.pop(); // restore polygon to pristine condition

        return A;

        // returns whether polygon encloses pole: sum of course deltas around pole is 0° rather than
        // normal ±360°: blog.element84.com/determining-if-a-spherical-polygon-contains-a-pole.html
        function isPoleEnclosedBy(p) {
            // TODO: any better test than this?
            let ΣΔ = 0;
            let prevBrng = p[0].initialBearingTo(p[1]);
            for (let v=0; v<p.length-1; v++) {
                const initBrng = p[v].initialBearingTo(p[v+1]);
                const finalBrng = p[v].finalBearingTo(p[v+1]);
                ΣΔ += (initBrng - prevBrng + 540) % 360 - 180;
                ΣΔ += (finalBrng - initBrng + 540) % 360 - 180;
                prevBrng = finalBrng;
            }
            const initBrng = p[0].initialBearingTo(p[1]);
            ΣΔ += (initBrng - prevBrng + 540) % 360 - 180;
            // TODO: fix (intermittant) edge crossing pole - eg (85,90), (85,0), (85,-90)
            const enclosed = Math.abs(ΣΔ) < 90; // 0°-ish
            return enclosed;
        }
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * Checks if another point is equal to ‘this’ point.
     *
     * @param   {LatLon} point - Point to be compared against this point.
     * @returns {bool}   True if points have identical latitude and longitude values.
     *
     * @example
     *   const p1 = new LatLon(52.205, 0.119);
     *   const p2 = new LatLon(52.205, 0.119);
     *   const equal = p1.equals(p2); // true
     */
    equals(point) {
        if (!(point instanceof LatLonSpherical)) point = LatLonSpherical.parse(point); // allow literal forms

        if (Math.abs(this.lat - point.lat) > Number.EPSILON) return false;
        if (Math.abs(this.lon - point.lon) > Number.EPSILON) return false;

        return true;
    }


    /**
     * Converts ‘this’ point to a GeoJSON object.
     *
     * @returns {Object} this point as a GeoJSON ‘Point’ object.
     */
    toGeoJSON() {
        return { type: 'Point', coordinates: [ this.lon, this.lat ] };
    }


    /**
     * Returns a string representation of ‘this’ point, formatted as degrees, degrees+minutes, or
     * degrees+minutes+seconds.
     *
     * @param   {string} [format=d] - Format point as 'd', 'dm', 'dms', or 'n' for signed numeric.
     * @param   {number} [dp=4|2|0] - Number of decimal places to use: default 4 for d, 2 for dm, 0 for dms.
     * @returns {string} Comma-separated formatted latitude/longitude.
     * @throws  {RangeError} Invalid format.
     *
     * @example
     *   const greenwich = new LatLon(51.47788, -0.00147);
     *   const d = greenwich.toString();                        // 51.4779°N, 000.0015°W
     *   const dms = greenwich.toString('dms', 2);              // 51°28′40.37″N, 000°00′05.29″W
     *   const [lat, lon] = greenwich.toString('n').split(','); // 51.4779, -0.0015
     */
    toString(format='d', dp=undefined) {
        // note: explicitly set dp to undefined for passing through to toLat/toLon
        if (![ 'd', 'dm', 'dms', 'n' ].includes(format)) throw new RangeError(`invalid format ‘${format}’`);

        if (format == 'n') { // signed numeric degrees
            if (dp == undefined) dp = 4;
            return `${this.lat.toFixed(dp)},${this.lon.toFixed(dp)}`;
        }
        const lat = Dms.toLat(this.lat, format, dp);
        const lon = Dms.toLon(this.lon, format, dp);
        return `${lat}, ${lon}`;
    }

}



var MagDec = 8;
latStr = "34 42 09S";
lonStr = "138 37 15E";
function getDestination(disance, trueBearing) {
    const lat1 = Dms.parse(latStr);
    const lon1 = Dms.parse(lonStr);
    const dist = disance; 
    const brng = Dms.parse(trueBearing);

    // calculate destination point, final bearing
    const p1 = new LatLonSpherical(lat1, lon1);
    const p2 = p1.destinationPoint(dist, brng);
    const brngFinal = p1.finalBearingTo(p2);

    let degFmt = 'dms';
    // display results
    
    return p2;

};
var flightsArr = [];
// Initialize and add the map
function initMap() {
    // The location of Uluru
    const uluru = { lat: -34.7025, lng: 138.620833333 };
    // The map, centered at Uluru
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: uluru,
        mapTypeId: 'satellite'
    });
}
function initMap2(crs) {
    const lat2 = Dms.parse(latStr);
    const lon2 = Dms.parse(lonStr);
    const relLoc = new LatLonSpherical(lat2, lon2);

    // The location of Uluru
    const uluru = { lat: relLoc.lat, lng: relLoc.lon};
    // The map, centered at Uluru
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 18,
        center: uluru,
        mapTypeId: 'satellite'
    });
    var bounds = new google.maps.LatLngBounds();

    mark = new google.maps.Marker({
        position: {lat: relLoc.lat, lng: relLoc.lon},
        label: "ARP",
        map: map
    });
    bounds.extend({lat: relLoc.lat, lng: relLoc.lon});
    for(let e of crs)
    {
        mark = new google.maps.Marker({
            position: {lat: e["latlong"].lat, lng: e["latlong"].lon},
            map: map
        });
        bounds.extend({lat: e["latlong"].lat, lng: e["latlong"].lon});
    }


    map.fitBounds(bounds);
}

function renderCrane(ind, crane) {
    var res = "";

    res += '<tr ind='+ ind +' role="button" data-href="#">';
    res += '<th>' + crane["NOTAM num"] + '</th>';
    res += '<th>' + crane["height"] + '</th>';
    res += '<td>' + crane["from"] + '</td>';
    res += '<td>' + crane["to"] + '</td>';
    res += '<td>' +"( " +  crane["DMAG"] + " MAG ) " +"( " +  crane["TN"] + " TN ) " + crane["distNM"] +'NM ' + crane["distM"]+'M'+ '</td>';
    res += '<td>' + crane["latlong"].toString('dms') + '</td>';
    res += '</tr>'

    $("#flight-table > tbody").append(res);
}
var cranes = [];
function parseCranes(linesArr){
    cr1 = []
    cr2 = []
    for (let i=0;i<linesArr.length;i++)
    {
        linesArr[i] = linesArr[i].trim().split(/\s+/).join(" ");
        if( i > 1 && linesArr[i].includes("OBST CRANE"))
        {
            str2 = "";
            for(let j = i-1;j>=0;j--)
            {
                if(linesArr[j].includes("FROM"))
                {
                    str2 = linesArr[j];
                    break;
                }
            }
            str2 = str2.trim();
            if(!str2) continue;
            dateStr = str2.split(" ");
            curCraneStr = linesArr[i].split(" ");
            degloc = curCraneStr.indexOf("MAG");
            degMag = curCraneStr[degloc - 1];
            distStr = curCraneStr[degloc + 1];
            num = "";
            for(let s of dateStr)
            {
                if(s.startsWith('C'))
                {
                    num = s;
                    break;
                }
            }
            cr1.push(
                {
                    "height" : curCraneStr[2],
                    "from" : dateStr[2] + " " + dateStr[3],
                    "to" : dateStr[5] + " " + dateStr[6],
                    "DMAG" : degMag,
                    "dist" : distStr,
                    "NOTAM num": num
                }
            );
        }
    }

    for (let i=0;i<linesArr.length;i++)
    {
        linesArr[i] = linesArr[i].trim().split(/\s+/).join(" ");
        if(linesArr[i].includes("OBST CRANE"))
        {
            linesArr[i] = linesArr[i].trim();
            str2 = "";
            for(let j = i-1;j>=0;j--)
            {
                if(linesArr[j].includes("FROM"))
                {
                    str2 = linesArr[j];
                    break;
                }
            }
            str2 = str2.trim();
            if(!str2) continue;
            console.log(str2);
            dateStr = str2.split(" ");
            curCraneStr = linesArr[i].split(" ");
            degloc = curCraneStr.indexOf("MAG");
            degMag = curCraneStr[degloc - 1];
            distStr = curCraneStr[degloc + 1];
            cr2.push(
                {
                    "height" : curCraneStr[2],
                    "from" : dateStr[1] + " " + dateStr[2],
                    "to" : dateStr[4] + " " + dateStr[5],
                    "DMAG" : degMag,
                    "dist" : distStr
                }
            );
        }
    }

    if(cr1.length >= cr2.length)
    {
        return cr1;
    }
    else
    {
        return cr2;
    }
}
function searchCranes() {
    $("#flight-table > tbody").empty();

    var pureText = $("#textArea").val();
    var hoursDiff = $("#hours-box").val();
    latStr = $("#latitude").val();
    lonStr = $("#longitude").val();
    MagDec = $("#magDec").val();

    hoursDiff = Number(hoursDiff)
    linesArr = pureText.split("\n");
    
    cr = parseCranes(linesArr);

    cranes = [];

    for (let i=0;i<cr.length;i++)
    {
        c = cr[i];

        degMag = Number(c["DMAG"]);
        degTrue = (degMag + MagDec + 360)%360;

        distStr = c["dist"];
        distM = 0;
        distNM = 0;
        if(distStr[distStr.length-2] == 'N')
        {
            distStr = distStr.replace(/[^\d.-]/g, '');
            distNM = Number(distStr);
            distM = distNM * 1852;
        }
        else
        {
            distStr = distStr.replace(/[^\d.-]/g, '');
            distM = Number(distStr);
            distNM = distM/1852;
            distNM = distNM.toFixed(2);
        }
        latlong = getDestination(distM, degTrue.toString());
        distM = Math.round(distM);

        toDate = new Date();
        today = new Date();
        if(!distStr.includes("PERM"))
        {
            toarr = c["to"].split(" ");
            toDate.setUTCMonth(Number(toarr[0])-1);
            toDate.setUTCDate(toarr[1][0]+toarr[1][1]);
            toDate.setUTCHours(toarr[1][2]+toarr[1][3]);
            toDate.setUTCMinutes(toarr[1][4]+toarr[1][5]);
        }
        var hours = (toDate.valueOf() - today.valueOf())/1000/60/60;
        if(!hoursDiff || hoursDiff >= hours)
        {
            cranes.push(
                {
                    "height" : c["height"],
                    "from" : c["from"],
                    "to" : c["to"],
                    "DMAG" : c["DMAG"],
                    "NOTAM num": c["NOTAM num"],
                    "TN" : degTrue,
                    "distM" : distM,
                    "distNM" : distNM,
                    "latlong" : latlong
                }
            );
        }

    }

    for (let i=0;i<cranes.length;i++)
    {
        renderCrane(i, cranes[i]);
    }

    initMap2(cranes);

}
$(function(){
    $(".table").on("click", "tr[role=\"button\"]", function (e) {
        ind = $(this).attr('ind');
        draw([cranes[ind]])
    });
});
function draw(crs) {
    window.initMap = initMap2(crs);
}