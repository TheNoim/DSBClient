import Client from './Client';
import DSBLib from 'dsbapi';
import ProgressBar from 'progress';

const client = new Client(process.env.DSBU, process.env.DSBP);
const lib = new DSBLib(process.env.DSBU, process.env.DSBP);


const bar = new ProgressBar('[:bar]', { total: 100, clear: true });

client.on('progress', function (p) {
	bar.tick(p);
});

(async function () {
	const d = await client.fetch();
	console.log(JSON.stringify(d));
})();



// lib.getData().then(data => {
// 	console.log(JSON.stringify(data))
// 	return Promise.resolve();
// }).then(() => {
// 	return client.fetch()
// 		.then(data => console.log(JSON.stringify(data)))
// 		.catch(e => console.error(e));
// });
