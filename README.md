# imap-fetch-everything

Scan an entire IMAP account and emit for every message found.

This module takes an instance of the
[imap](https://github.com/mscdex/node-imap) module, and
returns an emitter which emits for each message in each box
of the whole IMAP account, and an `end` event when all box
scans are complete.

## general use

Here is an example that you should be able to copy+paste
and have work. Remember that you'll be fetching _everything_,
which could be thousands of messages, depending on your account!

```js
const Imap = require('imap')
const fetchEverything = require('imap-fetch-everything')

const imap = new Imap({
	user: 'me@gmail.com',
	password: 'abc123',
	host: 'imap.gmail.com',
	port: 993,
	tls: true
})

imap.once('ready', () => {
	const fetcher = fetchEverything({ imap })

	fetcher.on('message', ({ message, box }) => {
		let body = ''
		message.on('body', stream => {
			stream.on('data', chunk => body += chunk.toString('utf8'))
		})
		message.on('attributes', attributes => {
			console.log(attributes)
		})
		message.on('info', info => {
			console.log(info)
		})
		message.on('end', () => {
			console.log(body)
		})
	})

	fetcher.on('error', error => {
		console.log(error)
	})

	fetcher.on('end', () => {
		imap.end()
	})
})

imap.on('error', error => {
	console.log(error)
})

imap.once('end', () => {
	console.log('connection ended!')
})

imap.connect()
```

## `fetchEverything(Object)`

The module takes an object with the following properties:

### `imap`

The instance of `imap` provided must be instantiated and
have already emitted the `ready` event.

### emitted events

The returned emitter will emit the following events:

#### `error` *(object)*

Each error object emitted has the following properties:

* `action` *(string)* The action which caused the error.
* `error` *(object|string)* The thrown error for that action.

The following error actions exist:

* `boxNames`: An error happened while getting the list of box names.
* `scanner.*`: Where `*` is any named error emitted from the module
	[imap-scan-many-boxes](https://www.npmjs.com/package/imap-scan-many-boxes).

#### `end`

Emitted after all actions have completed. Either by way
of all message fetches completing, or an error occuring which
prevents further scanning.

#### `message` *(object)*

Each message found during the fetch will be emitted with the
following properties:

* `sequenceNumber` *(integer)*: The sequence number of that fetch.
* `box` *(string)*: The name of the box the message is from.
* `message` *(event)*: An event emitter, see below.

The `message` emitter will emit the following events:

##### `attributes` *(object)*

Metadata about the message.

##### `info` *(object)*

Information about the `body` stream.

##### `body` *(stream)*

The string of the message body, as a JavaScript stream.

##### `end`

Emitted once all attributes are emitted, and once the `body` stream
has finished piping all `data` events.

## license

Published and released under the [VOL](http://veryopenlicense.com).
