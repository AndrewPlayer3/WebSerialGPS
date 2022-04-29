# WebSerialGPS
This is an offline web application using the [WebSerial API](https://web.dev/serial/) for reading GPS data over Serial from a [GT-U7 NEO-6M GPS](https://images-na.ssl-images-amazon.com/images/I/91tuvtrO2jL.pdf). Although, in theory, this should work for any Serial GPS that uses NMEA GPGGA messages, but its usbVendorId will need to be added in serial.js.

### How to Run
Connect the GPS via USB to your computer, then open the index.html file in a browser that supports the WebSerial API. **NOTE**, only Chromium based browsers support WebSerial at the time of writing this, so using Google Chrome, or some other modern Chromium browser is recommended. I have personally validated that this works in Chrome and Edge on Windows 11 and Ubuntu.<br>
Once the page is open simply click Select Device, do that, and then click run.

### NMEA GPS Serial Format Basics
 #### Basic Standards:
 - Messages start with '$' and end with '\<CR>\<LF>'
 - The first 2 chars after '$' is the *talker*
 - The three chars after the *talker* is the *type*
 - The information between the *type* and the '\*' is the data
 - The data is comma delimited
 - The number after the '\*' is the checksum for message validation
 - The maximum message length is 82 characters
 
 #### $GPGGA Message Example:
 ```
 $GPGGA,075909.00,6451.53390,N,14749.78748,W,1,04,8.23,149.4,M,5.8,M,,*75
  
 $GPGGA,         -- 00 - Message Type: GPGGA
 075909.00,      -- 01 - Timestamp
 6451.53390,     -- 02 - Latitude            -- 64  degrees, 51.53390 minutes
 N,              -- 03 - Latitude Direction
 14749.78748,    -- 04 - Longitude           -- 147 degrees, 49.78748 minutes
 W,              -- 05 - Longitude Directions
 1,              -- 06 - Fix Quality (0 is invalid, 1 is GPS, 2 is DGPS)
 04,             -- 07 - Satellite Count
 8.23,           -- 08 - Horizontal Dilution of Precision
 149.4,          -- 09 - Altitude
 M,              -- 10 - Altitude unit: meters
 5.8,            -- 11 - Height of geoid above WGS84 ellipsoid
 M,              -- 12 - Geoid height unit: meters
 ...,            -- 13 - Time since last DGPS update (can leave blank)
 ...             -- 14 - DGPS reference station id   (can leave blank)
 *75             -- 14 - Checksum (same array position as last piece.)
 ```

### Screenshot
![Screenshot from 2022-04-23 03-35-26](https://user-images.githubusercontent.com/19739107/166073863-f31d2952-41a9-47aa-a33b-029210a7dbc4.png)

### Further Resources
  - [In-Depth NMEA GPS Sentence Information](http://aprs.gids.nl/nmea/)
  - [NMEA GPS Wikipedia](https://en.wikipedia.org/wiki/NMEA_0183)
  - [Google's WebSerial API Docs](https://web.dev/serial/)
  - [Mozilla's WebSerial API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
  - [The GPS I Use](https://www.amazon.com/Navigation-Satellite-Compatible-Microcontroller-Geekstory/dp/B07PRGBLX7)
