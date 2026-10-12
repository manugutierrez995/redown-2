// Separate process fixture uses the production service, ledger, source and destination ports.
import {createService} from '../../remote/service.mjs';
import {Ledger} from '../../remote/store.mjs';
import {HttpSource} from '../../remote/adapters/http-source.mjs';
import {R2Gateway} from '../../remote/adapters/r2-gateway.mjs';
const config=JSON.parse(process.argv[2]);
const ledger=new Ledger(config.database,{leaseMs:500});
const service=createService({ledger,tenants:[{id:'process-tenant',token:'fixture-token',destinations:[config.destination]}],
 source:new HttpSource({allowedHosts:['127.0.0.1'],fixtureLoopback:true}),
 destinationFor:()=>new R2Gateway({url:config.gateway,token:'gateway-test-secret',...config.destination}),partBytes:5*1024*1024,
 fault:async point=>{if(config.crashAt===point)process.exit(86);}});
service.server.listen(0,'127.0.0.1',()=>console.log('READY '+service.server.address().port));
const timer=setInterval(()=>service.tick().catch(e=>console.error(e.code||'TEST_EXECUTOR_ERROR')),25);
process.on('SIGTERM',()=>{clearInterval(timer);service.server.close(()=>{ledger.close();process.exit(0);});});
