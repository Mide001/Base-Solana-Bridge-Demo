import { encodeFunctionData, parseAbi } from "viem";

const abi = parseAbi([
    'function increment()',
    'function setValue(uint256 _newCount)',
]);

function main() {
    const incrementData = encodeFunctionData({
        abi,
        functionName: "increment",
    });
    console.log("increment() HEX: \n", incrementData);

    const setValueData = encodeFunctionData({
        abi,
        functionName: "setValue",
        args: [10n] // pass 10 as value 
    });
    console.log("setValue(10) HEX: \n", setValueData);
    console.log("--------------------------------");
}

main();