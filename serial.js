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
                    if (data.startsWith('$GPGGA')) document.querySelector('#dataField').innerText = 'Data: ' + data
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
