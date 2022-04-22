/*/
 *    Name: serial.js
 *    Author: Andrew Player
 *    Desicrption: Script for reading gps data from a serial enabled neo-6m gps.
 *    Note: See the README for resources describing the relevant NMEA Sentence Standards.  
/*/


let reader, 
    gpsPort
let keepReading = true,
    needConcat  = false,
    showMap     = false,
    portIsOpen  = false,
    loaded      = false
let data_string = ''
let data_arr    = []
let lat_state   = 0
let lon_state   = 0
let decoder     = new TextDecoder('UTF-8')

let logs = 
{
    positioning: [],
    quality: []
}

var map


/* Request access to the GPS's port, and open it so it can be read. */
async function openGPSPort() 
{
    try 
    {
        gpsPort = await navigator.serial.requestPort(
            {
                filters: 
                [
                    {
                        usbVendorId: 0x1546, // GPS USB Vendor ID, can be found by using lsusb
                    },                       // You may need to add your GPS's vid here ❗
                ],
            }
        )
        console.log(
            'Selected Port: ', gpsPort.getInfo()
        )
        await gpsPort.open(
            {
                baudRate: 9600,
                dataBits: 8,
                endBits: 1,
            }
        )
        console.log(
            'The selected port has been opened.'
        )
        return true
    } catch (error) 
    {
        console.log(
            'Error Opening Port: ', error.message
        )
        return false
    }
}


async function checkBounds() {
    
    let bounds = map.getBounds()

    let passedNorth = Math.abs(lat_state) > Math.abs(bounds.getNorth()) - 0.0005
    let passedSouth = Math.abs(lat_state) < Math.abs(bounds.getSouth()) + 0.0005
    let passedEast  = Math.abs(lon_state) < Math.abs(bounds.getEast( )) + 0.0005
    let passedWest  = Math.abs(lon_state) > Math.abs(bounds.getWest( )) - 0.0005
    
    if (
        passedNorth || passedSouth || passedEast || passedWest
    ) {
        await map.setView(new L.LatLng(lat_state, -lon_state))
    }
}


/* Parse an NMEA GPS Sentence to get a more displayable format. */ 
async function parseNMEAMessage(data)
{
    try
    {
        let message
        switch (data.substring(0, 6))
        {
            case '$GPGGA':
                message = new GPGGA(data)
                document.querySelector('#dataField1')
                    .innerText = message.toStringVerbose()
                if (message.satellites != 0)
                {
                    lat_state = message.latitude
                    lon_state = message.longitude
                    document.querySelector('#dataField').innerText = 'Data: Loaded'
                    await checkBounds()
                }

                logs.quality.push(
                    {
                        sat_count: message.satellites,
                        quality: message.quality,
                        hdop: message.dilution,
                        time: message.timestamp
                    }
                )

                break
            case '$GPRMC':
                message = new GPRMC(data)
                document.querySelector('#dataField2')
                    .innerText = message.toStringVerbose()

                logs.positioning.push(
                    {
                        latitude: message.latitude,
                        longitude: message.longitude,
                        speed: message.speed,
                        course: message.course,
                        time: message.timestamp,
                        date: message.date
                    }
                )

                break
            case '$GPGSA':
                message = new GPGSA(data)
                document.querySelector('#dataField3')
                    .innerText = message.toString()
                break
            case '$GPGLL':
                message = new GPGLL(data)
                document.querySelector('#dataField4')
                    .innerText = message.toString()
                break
            case '$GPVTG':
                message = new GPVTG(data)
                document.querySelector('#dataField5')
                    .innerText = message.toString()
                break
            default:
                message = null
                break
        }
        return message
    } catch (error) 
    {
        console.log(
            "Error Processing GPRMC Sentence: " + error.message
        )
        return null
    }
}


/* Keep reading and displaying the GPS serial data until user clicks stop. */
async function readUntilClosed() 
{
    while (gpsPort.readable && keepReading) 
    {
        reader = gpsPort.readable.getReader()
        try 
        {
            while (true) 
            {
                const { value, done } = await reader.read()
                
                if (done) // "done" is when the user clicks stop,
                    break //  not necessarily when the reader is done.
                
                let temp_string = needConcat              
                    ? data_string + decoder.decode(value) 
                    : decoder.decode(value)               
                data_arr = temp_string.split('\r\n')      
                
                if (!temp_string.endsWith('\r\n')) // Reading is asyncronous, so there is no guarentee of
                {                                  // position in the data stream, and there is no readline(). 
                    needConcat = true              // So, we check for no line end \r\n and add it to the next
                    data_string += data_arr.pop()  // message until a line end is reached.
                } else 
                {
                    needConcat = false
                    data_string = ''
                }
                
                for (let j = 0; j < data_arr.length; j++) 
                {
                    let message = await parseNMEAMessage(data_arr[j])
                }
                data_arr = []
            }
        } catch (error) 
        {
            console.log(
                'Error in Reader Loop: ', error.message
            )
        } finally 
        {
            reader.releaseLock()
        }
    }
    await gpsPort.close()
}


async function getNewFileHandle() {
    const opts = {
        types: [
            {
                description: 'JSON data',
                accept: { 'application/json': ['.json'] },
            },
        ],
    }
    return window.showSaveFilePicker(opts)
}


async function writeFile(fileHandle, contents) {
    try
    {
        const writable = await fileHandle.createWritable();
        await writable.write(contents)
        await writable.close();
        
        alert('File saved.')
        return;
    } catch (error)
    {
        alert('Error writing the file. ' + error.message)
    }
}


/* Once the DOM is loaded, this creates the event listeners for the buttons. */
document.addEventListener('DOMContentLoaded', 
    async () => 
    {
        let connect_button    = document.querySelector('#connect')
        let disconnect_button = document.querySelector('#disconnect')
        let run_button        = document.querySelector('#run')
        let map_button        = document.querySelector('#map-btn')
        let save_button       = document.querySelector('#save-btn')

        connect_button.addEventListener('click', 
            async () => 
            {
                if (await openGPSPort())
                {
                    run_button.setAttribute('style', 'visibility:visible')
                    document.querySelector('#dataField')
                        .innerText = 'Click run to begin.'
                } else
                {
                    document.querySelector('#dataField')
                        .innerText = 'Error opening port. Try again... :('
                }
            }
        )

        disconnect_button.addEventListener('click', 
            async () => 
            {
                keepReading = false
                await reader.cancel()
                console.log(
                    'The serial port has been closed.'
                )
                run_button.setAttribute('style', 'visibility: hidden')
                disconnect_button.setAttribute('style', 'visibility: hidden')
            }
        )

        run_button.addEventListener('click',
            async () => 
            {
                document.querySelector('#dataField').innerText = 'Data: Loading...'
                loaded = true
                readUntilClosed()
                disconnect_button.setAttribute('style', 'visibility: visible')
                save_button.setAttribute('style', 'visibility: visible')
            }
        )

        map_button.addEventListener('click',
            async () => 
            {
                showMap    = !showMap
                visibility =  showMap 
                    ? "hidden"
                    : "visible"
                document.querySelector('#map')
                    .setAttribute('style', `height: 480px; width: 640px;visibility: ${visibility};`)
            }
        )

        save_button.addEventListener('click',
            async () =>
            {
                let fileHandle = await getNewFileHandle()
                let contents   = JSON.stringify(logs)
                console.log(contents)
                await writeFile(fileHandle, contents)
            }
        )

        map = L.map('map', 
            {
                center: [lat_state, -lon_state],
                zoom: 16
            }
        );

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
            { 
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
            }
        ).addTo(map);
    }
)


setInterval(
    () =>
    {
        if (loaded)
        {
            L.circleMarker([lat_state, -lon_state], 
                {
                    radius: 2
                }
            ).addTo(map)
        }   
    }, 2000
)    
