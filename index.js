const EventEmitter = require('events')
const boxNames = require('imap-box-names')
const scanBoxes = require('imap-scan-many-boxes')

const fetch = {
	bodies: '', // include full message
	struct: true
}

module.exports = ({ imap }) => {
	const emitter = new EventEmitter()

	boxNames(imap, (error, boxes) => {
		if (error) {
			emitter.emit('error', {
				action: 'boxNames',
				error
			})

		} else {
			const scanner = scanBoxes({ imap, boxes, fetch })

			scanner.on('message', ({ stream, box }) => {
				let body = ''
				let attributes

				stream.on('body', (bodyStream, info) => {
					bodyStream.on('data', chunk => body += chunk.toString('utf8'))
				})

				stream.once('attributes', data => {
					attributes = data
				})

				stream.once('end', () => {
					const data = {
						message: {
							body,
							attributes,
							box
						},
						generatedId: shortid.generate()
					}
					emitter.emit('message', data)
				})
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
