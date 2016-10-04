let installBtn = document.querySelector('.install')

let success = (data) => {
    console.log('success', data)
}

let fail = (err) => {
    console.error(err)
}

installBtn.onclick = (event) => {
    window.chrome.webstore.install('https://chrome.google.com/webstore/detail/idmpmcojkloaepopblkoiebbldelfnio', success, fail)
}
