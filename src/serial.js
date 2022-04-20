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
    portIsOpen  = false
let data_string = ''
let data_arr    = []
let decoder     = new TextDecoder('UTF-8')


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


/* Build the OpenStreetMap Embed URL to display the given location. */
async function getMapURL(latitude, longitude) 
{
    let north_bound = latitude + 0.0005
    let south_bound = latitude - 0.0005
    let east_bound  = longitude - 0.0005
    let west_bound  = longitude + 0.0005

    // TODO: The bounding box likely doesn't need to be updated every time,
    //       maybe set a distance threshold and only update the marker.
    let url_base   = "https://www.openstreetmap.org/export/embed.html?"
    let url_box    = `bbox=${-west_bound}%2C${south_bound}%2C${-east_bound}%2C${north_bound}`
    let url_layer  = "&layer=mapnik"
    let url_marker = `&marker=${latitude}%2C${-longitude}`
    let url        = url_base + url_box + url_layer + url_marker

    let map = document.querySelector('#map');
    map.setAttribute('src', url)
}


/* Parse an NMEA GPS Sentence to get a more displayable format. */ 
async function parseNMEAMessage(data)
{
    if (data.startsWith('$GPGGA')) 
    {
        try 
        {
            let message = new GPGGA(data)
            return message
        } catch (error) 
        {
            console.log(
                "Error Processing GPGGA Sentence: ", error.message
            )
            return null
        }
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
                
                if (!temp_string.endsWith('\r\n')) 
                {
                    needConcat = true
                    data_string += data_arr.pop()
                } else 
                {
                    needConcat = false
                    data_string = ''
                }
                
                for (let j = 0; j < data_arr.length; j++) 
                {
                    let message = await parseNMEAMessage(data_arr[j])
                    if (
                        message &&
                        message.type == 'GGA' &&
                        message.latitude != 0 &&
                        message.longitude != 0
                    ){
                        document.querySelector('#dataField')
                            .innerText = message.toStringVerbose()
                        if (showMap) 
                            await getMapURL(message.latitude, message.longitude)
                    }
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


/* Once the DOM is loaded, this creates the event listeners for the buttons. */
document.addEventListener('DOMContentLoaded', 
    async () => 
    {
        let connect_button    = document.querySelector('#connect')
        let disconnect_button = document.querySelector('#disconnect')
        let run_button        = document.querySelector('#run')
        let map_button        = document.querySelector('#map-btn')

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
                disconnect_button.setAttribute('style', 'visibility: visible')
                document.querySelector('#dataField').innerText = 'Data: Loading...'
                readUntilClosed()
            }
        )

        map_button.addEventListener('click',
            async () => 
            {
                showMap    = !showMap
                visibility =  showMap 
                    ? "visible"
                    : "hidden"
                document.querySelector('#map')
                    .setAttribute('style', `visibility: ${visibility}`)
            }
        )
    }
)


