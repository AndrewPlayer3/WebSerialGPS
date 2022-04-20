/*/
 *    Name: serial.js
 *    Author: Andrew Player
 *    Desicrption: Script for reading gps data from a serial enabled neo-6m gps.
 *    Note: See bottom for description of relevand NMEA standards.  
/*/

let reader, gpsPort
let keepReading = true,
    needConcat = false
let data_string = ''
let data_arr = []
let decoder = new TextDecoder('UTF-8')


async function openGPSPort() {
    try {
        gpsPort = await navigator.serial.requestPort({
            filters: [
                {
                    usbVendorId: 0x1546,
                },
            ],
        })
        console.log('Selected Port: ', gpsPort.getInfo())
        await gpsPort.open({
            baudRate: 9600,
            dataBits: 8,
            endBits: 1,
        })
        console.log('Port has been opened.')
    } catch (error) {
        console.log('Error Opening Port: ', error.message)
    }
}


async function getMapURL(latitude, longitude) {

    let north_bound = latitude + 0.5
    let south_bound = latitude - 0.5
    let east_bound  = longitude + 0.5
    let west_bound  = longitude - 0.5

    let url_base = "https://www.openstreetmap.org/export/embed.html?"
    let url_box = `bbox=${-west_bound}%2C${south_bound}%2C${-east_bound}%2C${north_bound}`
    let url_layer = "&amp;layer=mapnik"
    let url_marker = `&amp;marker=${latitude}%2C${-longitude}`

    let url = url_base + url_box + url_layer + url_marker

    let map = document.querySelector('#map');
    map.setAttribute('src', url)
}


async function readUntilClosed() {
    console.log('Beginning Read Function...')
    while (gpsPort.readable && keepReading) {
        reader = gpsPort.readable.getReader()
        try {
            while (true) {
                const { value, done } = await reader.read()
                if (done) {
                    console.log('Reader has been canceled by the user.')
                    break
                }
                let temp_string = needConcat
                    ? data_string + decoder.decode(value)
                    : decoder.decode(value)
                data_arr = temp_string.split('\r\n')
                if (!temp_string.endsWith('\r\n')) {
                    needConcat = true
                    data_string += data_arr.pop()
                } else {
                    needConcat = false
                    data_string = ''
                }
                for (let j = 0; j < data_arr.length; j++) {
                    let data = data_arr[j]
                    if (data.startsWith('$GPGGA')) {
                        try {
                            let message = new GPGGA(data)
                            let dataField = document.querySelector('#dataField')
                            dataField.innerText = message.toString()
                            await getMapURL(message.latitude, message.longitude)
                        } catch (error) {
                            console.log("nmea.js script is likely missing: ", error.message)
                        }
                    }
                }
                data_arr = []
            }
        } catch (error) {
            console.log('An error has occured while reading: ', error.message)
        } finally {
            reader.releaseLock()
        }
    }
    await gpsPort.close()
    console.log('Ending Read Function...')
}


document.addEventListener('DOMContentLoaded', async () => {
    let connect_button = document.querySelector('#connect')
    let disconnect_button = document.querySelector('#disconnect')
    let run_button = document.querySelector('#run')

    connect_button.addEventListener('click', async () => {
        await openGPSPort()
        run_button.setAttribute('style', 'visibility:visible')
    })

    disconnect_button.addEventListener('click', async () => {
        keepReading = false
        await reader.cancel()
        console.log('Port has been closed.')
        run_button.setAttribute('style', 'visibility: hidden')
        disconnect_button.setAttribute('style', 'visibility: hidden')
    })

    run_button.addEventListener('click', async () => {
        disconnect_button.setAttribute('style', 'visibility: visible')
        document.querySelector('#dataField').innerText = 'Data: Loading...'
        readUntilClosed()
    })
})


