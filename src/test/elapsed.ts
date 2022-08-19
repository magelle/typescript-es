import {hrtime} from 'node:process';

export const elapsed = <T extends Function>(name: string, fct: T) => {
    return (...args: any[]) => {
        const start = getMicroSecTime();
        const result = fct.call(null, ...args);
        if (result instanceof Promise) {
            return result.then((res) => {
                const end = getMicroSecTime();
                console.log(`${name} : took ${end - start}us`);
                return res;
            })
        } else {
            const end = getMicroSecTime();
            console.log(`${name} : took ${end - start}us`);
            return result;
        }
    }
}

export function getMicroSecTime() {
    return hrtime.bigint() / BigInt(1000);
}
