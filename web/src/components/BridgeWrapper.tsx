"use client";

import dynamic from "next/dynamic";

const BridgeForm = dynamic(
    () => import("./BridgeForm").then((mod) => mod.BridgeForm),
    { ssr: false }
);

export function BridgeWrapper() {
    return <BridgeForm />;
}
