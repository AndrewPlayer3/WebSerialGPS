/*/
 *  Name: nmea.js
 *  Author: Andrew Player
 *  Description: Classes for handling NMEA 1803 GPS messages.
 *  Note: Check the README for more resources on NMEA Sentences.
/*/ 

class NMEAGPSMessage 
{
/*/ NMEA GPS Message Class 
 *  
 *  Basic Standards:
 *  ----------------
 *  1. Messages start with $ and end with <CR><LF>
 *  2. The first 2 chars after $ are the 'talker type'
 *  3. The three chars after the talker are the message type
 *  4. The information between the type and the * is the data
 *  5. The data is comma delimited
 *  6. The number after the * is the checksum for message validation
/*/

    message      = ''
    messageArray = []
    talker       = '$GP' // $GPGGA -- $GP is talker, GGA is type
    type         = ''    //

    constructor(message) 
    {
        this.#validateMessage(message)
        this.message      = message
        this.messageArray = this.message.split(',')
        this.type         = this.messageArray[0].substring(3, 6)
    }


    /* Validate the message against NMEA Standards */
    #validateMessage(message)
    {         
        if (!message.startsWith(this.talker)) 
            throw 'Invalid NMEA GPS Talker! Message does not start with $GP:\n' + message

        if (message.length > 82)
            throw 'Invalid NMEA GPS Length! Message is longer than 82 characters:\n' + message

    
        /*/ Checksum Validation 
         *  -------------------
         *  The checksum value occurs after the * at the end of the message
         *  Every char after $ and before * must be XOR'd and must be equal to the checksum
        /*/
        let checksum = message.split('*')[1]
        let chars    = message.split('*')[0].substring(1) 

        if (checksum == '')
            throw 'Invalid NMEA GPS Message! Message has no checksum:\n' + message
    
        let char = chars.charCodeAt(0)
        for (let i = 1; i < chars.length; i++) 
        {
            char = char ^ chars.charCodeAt(i);
        }
        
        if (char.toString(16) !== checksum)
            throw `Corrupted NMEA GPS Message! Checksum is ${checksum} but calculated ${char.toString(16)} for message:\n` + message
    }
}


class GPGGA extends NMEAGPSMessage 
{
/*/ GGA Message Standard:
 *  ---------------------
 *  $GPGGA,         -- 00 - Message Type: GPGGA
 *  075909.00,      -- 01 - Timestamp
 *  6451.53390,     -- 02 - Latitude            -- 64  degrees, 51.53390 minutes
 *  N,              -- 03 - Latitude Direction
 *  14749.78748,    -- 04 - Longitude           -- 147 degrees, 49.78748 minutes
 *  W,              -- 05 - Longitude Directions
 *  1,              -- 06 - Fix Quality (0 is invalid, 1 is GPS, 2 is DGPS)
 *  04,             -- 07 - Satellite Count
 *  8.23,           -- 08 - Horizontal Dilution of Precision
 *  149.4,          -- 09 - Altitude
 *  M,              -- 10 - Altitude unit: meters
 *  5.8,            -- 11 - Height of geoid above WGS84 ellipsoid
 *  M,              -- 12 - Geoid height unit: meters
 *  ...,            -- 13 - Time since last DGPS update (can leave blank)
 *  ...             -- 14 - DGPS reference station id   (can leave blank)
 *  *75             -- 14 - Checksum (same array position as last piece.)
/*/

    type = 'GGA'

    timestamp    =  0    // hhmmss.ss UTC
    utc          = 'HH:MM:SS.MS'
    lat          = '0000.00000'
    latitude     =  0
    latDirection = 'N/A' // 'N' or 'S'
    lon          = '00000.00000'
    longitude    =  0
    lonDirection = 'N/A' // 'W' or 'E'
    altitude     =  0
    satellites   =  0
    quality      =  0
    dilution     =  0
    geoidHeight  =  0

    constructor(message) 
    {        
        super(message)

        if (!message.substring(3).startsWith(this.type))
            throw 'Invalid GPGGA Message! Message does not start with $GPGGA:\n' + message

        this.#setTime()
        this.#setLatitude()
        this.#setLongitude()

        this.latDirection = this.messageArray[3 ]
        this.lonDirection = this.messageArray[5 ]
        this.quality      = this.messageArray[6 ]
        this.satellites   = this.messageArray[7 ]
        this.dilution     = this.messageArray[8 ]
        this.altitude     = this.messageArray[9 ]
        this.geoidHeight  = this.messageArray[11]
    }

    #setLatitude() 
    {
        this.lat      = this.messageArray[2]
        let degrees   = Number(this.lat.substring(0, 2))
        let minutes   = Number(this.lat.substring(2))
        this.latitude = degrees + minutes / 60
    }

    #setLongitude() 
    {
        this.lon       = this.messageArray[4]
        let degrees    = Number(this.lon.substring(0, 3))
        let minutes    = Number(this.lon.substring(3))
        this.longitude = degrees + minutes / 60
    }

    #setTime() 
    {
        let time = this.messageArray[1]
        this.utc = `${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4)}UTC` // HH:MM:SS.SS
        this.timestamp = Number(time)
    }

    latString() 
    {
        return `${this.latitude.toPrecision(10) }${this.latDirection}`
    }

    lonString() 
    {
        return `${this.longitude.toPrecision(10)}${this.lonDirection}`
    }

    altString() 
    {
        return `${this.altitude}${this.messageArray[10]}`
    }

    geoidString() 
    {
        return `${this.geoidHeight}${this.messageArray[12]}`
    }

    toString() 
    {
        return  `Latitude:   ${this.latString()}\n` +
                `Longitude:  ${this.lonString()}\n` +
                `Altitude:   ${this.altString()}\n` +
                `Satellites: ${this.satellites}\n` +
                `Time:       ${this.utc}`
    }

    toStringVerbose() 
    {
        return  `Latitude:   ${this.latString()}\n` +
                `Longitude:  ${this.lonString()}\n` +
                `Altitude:   ${this.altString()}\n` +
                `GEOID:      ${this.geoidString()}\n` +
                `Satellites: ${this.satellites}\n` +
                `Quality:    ${this.quality}\n` +
                `Dilution:   ${this.dilution}\n` + 
                `Time:       ${this.utc}`
    }
}