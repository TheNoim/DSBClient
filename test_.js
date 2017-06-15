import Client from './Client';
import DSBLib from 'dsbapi';
const client = new Client(process.env.DSBU, process.env.DSBP);
const lib = new DSBLib(process.env.DSBU, process.env.DSBP);
lib.getData().then(data=> {
    console.log(JSON.stringify(data))
    return Promise.resolve();
}).then(() => {
    return client.fetch()
        .then(data=>console.log(JSON.stringify(data)))
        .catch(e => console.error(e));
});
