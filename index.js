const EventEmitter = require('events')
const boxNames = require('imap-box-names')
const scanManyBoxes = require('imap-scan-many-boxes')

const fetch = {
	bodies: '', // include full message
	struct: true // include extra metadata
}

module.exports = ({ imap }) => {
	const emitter = new EventEmitter()

	boxNames(imap, (error, boxes) => {
		if (error) {
			setImmediate(() => {
				emitter.emit('error', {
					action: 'boxNames',
					error
				})
				emitter.emit('end')
			})
		} else {
			const scanner = scanManyBoxes({ imap, boxes, fetch })

			scanner.on('opened', box => emitter.emit('opened', box))

			scanner.on('message', ({ stream, box, sequenceNumber }) => {
				const message = new EventEmitter()

				stream.on('body', (body, info) => {
					message.emit('info', info)
					message.emit('body', body)
				})

				stream.once('attributes', attributes => {
					message.emit('attributes', attributes)
				})

				stream.once('end', () => {
					message.emit('end')
				})

				emitter.emit('message', { message, box, sequenceNumber })
			})

			scanner.on('error', ({ action, error, box }) => {
				emitter.emit('error', {
					action: `scanner.${action}`,
					error,
					box
				})
			})

			scanner.on('end', () => {
				emitter.emit('end')
			})
		}
	})

	return emitter
}
