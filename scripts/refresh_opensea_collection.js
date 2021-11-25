const prompt = require('prompt-sync')()
const fetch = url => import('node-fetch').then(({ default: fetch }) => fetch(url))

async function main () {
    const contractAddress = prompt('Contract address? ')
    const fromTokenId = prompt('From token id? ')
    const toTokenId = prompt('To token id? ')

    console.log(`Refreshing opensea collection ${contractAddress} from ${fromTokenId} to ${toTokenId}`)
    prompt('\nIf happy, hit enter...\n')

    for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
        const url = `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}/?force_update=true`
        console.log(`Fetching from  ${url}`)
        await fetch(url)

        console.log(`Done with ${tokenId}`)
    }

    console.log('Finished!')
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
