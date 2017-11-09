const test = require('tape')
const proxyquire = require('proxyquire')
const EventEmitter = require('events')

test('when there is an error getting the list of boxes', t => {
	t.plan(4)
	const mockImap = 'mock imap object'
	const error = { a: 'b' }

	const fetchEverything = proxyquire('./index', {
		'imap-box-names': imap => {
			t.equal(mockImap, imap, 'the imap object is untouched')
			return Promise.reject(error)
		},
		'imap-scan-many-boxes': () => {
			t.fail('an earlier error should prevent scanning')
		}
	})

	const fetcher = fetchEverything({ imap: mockImap })

	fetcher.on('error', output => {
		t.ok(output.error === error, 'the error is the same by reference')
		t.equal(output.action, 'boxNames', 'the error happens while getting the box names')
	})

	fetcher.on('end', () => {
		t.pass('the fetcher must end')
		t.end()
	})
})

test('if the scanner emits an error more messages are still handled', t => {
	t.plan(13)
	const mockImap = 'mock imap object'
	const scannerEmitter = new EventEmitter()

	const fetchEverything = proxyquire('./index', {
		'imap-box-names': (ignore, callable) => {
			return Promise.resolve([ 'INBOX', 'INBOX.stuff' ])
		},
		'imap-scan-many-boxes': ({ imap, boxes, fetch }) => {
			t.equal(imap, mockImap, 'the imap object is untouched')
			t.deepEqual(boxes, [ 'INBOX', 'INBOX.stuff' ], 'provided box names')
			t.deepEqual(fetch, { bodies: '', struct: true }, 'the fetch object')
			return scannerEmitter
		}
	})

	const fetcher = fetchEverything({ imap: mockImap })

	fetcher.on('message', ({ message, box, sequenceNumber }) => {
		t.equal(box, 'INBOX', 'box of the message object')
		t.equal(sequenceNumber, '123', 'sequence number as found by box scanner')
		let events = 0
		message.on('info', info => {
			events++
			t.equal(info, 'the info', 'the info from the scanner is passed by reference')
		})
		message.on('attributes', atts => {
			events++
			t.equal(atts, 'the atts', 'the attributes from the scanner are passed by reference')
		})
		message.on('body', body => {
			events++
			t.equal(body, 'the body', 'the body is a streaming object but really just passed by reference')
		})
		message.on('end', () => {
			t.equal(events, 3, 'an end event is emitted *after* all other events')
		})
	})

	fetcher.on('error', output => {
		t.equal(output.action, 'scanner.scanAction', 'the error is from the scanner')
		t.equal(output.error, 'oh no', 'the error is whatever the scanner error is')
		t.equal(output.box, 'INBOX.stuff', 'the box name is provided')
	})

	fetcher.on('end', () => {
		t.pass('the fetcher must end')
		t.end()
	})

	// the stuff below here is essentially a mock of `imap-scan-many-boxes`

	setImmediate(() => {
		scannerEmitter.emit('error', {
			action: 'scanAction',
			error: 'oh no',
			box: 'INBOX.stuff'
		})

		setImmediate(() => {
			const stream = new EventEmitter()
			scannerEmitter.emit('message', {
				stream,
				box: 'INBOX',
				sequenceNumber: '123'
			})

			setImmediate(() => {
				stream.emit('attributes', 'the atts')
				stream.emit('body', 'the body', 'the info')
			
				setImmediate(() => {
					stream.emit('end')

					setImmediate(() => {
						scannerEmitter.emit('end')
					})
				})
			})
		})
	})
})
