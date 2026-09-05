import {
  runAfterResponseHook,
  runBeforeRequestHook,
  runFetchWithSignal,
  runWithSignal,
} from "./generated-runtime-template/lifecycle.ts";

for (const stage of ["beforeRequest", "fetch", "afterResponse", "headers"] as const) {
  Deno.test(`cancellation prevents a queued ${stage} callback from starting`, async () => {
    const controller = new AbortController();
    const reason = new Error("caller canceled");
    let callbacks = 0;
    let canceled: unknown;
    const body = new ReadableStream<Uint8Array>({
      cancel(value) {
        canceled = value;
      },
    });
    const request = new Request("https://provider.invalid", { method: "POST", body });
    const response = new Response(body);
    const callback = <T>(result: T): T => {
      callbacks++;
      return result;
    };
    const pending = stage === "beforeRequest"
      ? runBeforeRequestHook(request, () => callback(request), controller.signal)
      : stage === "fetch"
      ? runFetchWithSignal(request, () => callback(response), controller.signal)
      : stage === "afterResponse"
      ? runAfterResponseHook(response, () => callback(response), controller.signal)
      : runWithSignal(() => callback("headers"), controller.signal);
    controller.abort(reason);
    try {
      await pending;
      throw new Error("Canceled operation resolved");
    } catch (error) {
      if (error !== reason) throw error;
    }
    if (callbacks !== 0) throw new Error("Callback started after cancellation");
    if (stage !== "headers" && canceled !== reason) {
      throw new Error("Cancellation did not release the owned body");
    }
    await body.cancel();
  });
}

for (const stage of ["beforeRequest", "fetch", "afterResponse"] as const) {
  Deno.test(`${stage} cancellation releases a replacement that arrives after the callback started`, async () => {
    const controller = new AbortController();
    const reason = new Error("caller canceled");
    const started = Promise.withResolvers<void>();
    const replacement = Promise.withResolvers<void>();
    const released = Promise.withResolvers<unknown>();
    const lateBody = new ReadableStream<Uint8Array>({
      cancel(value) {
        released.resolve(value);
      },
    });
    const request = new Request("https://provider.invalid");
    const response = new Response(null);
    const lateRequest = new Request(request.url, { method: "POST", body: lateBody });
    const lateResponse = new Response(lateBody);
    const callback = async <T>(value: T): Promise<T> => {
      started.resolve();
      await replacement.promise;
      return value;
    };
    const pending = stage === "beforeRequest"
      ? runBeforeRequestHook(request, () => callback(lateRequest), controller.signal)
      : stage === "fetch"
      ? runFetchWithSignal(request, () => callback(lateResponse), controller.signal)
      : runAfterResponseHook(response, () => callback(lateResponse), controller.signal);
    await started.promise;
    controller.abort(reason);
    try {
      await pending;
      throw new Error("Canceled operation resolved");
    } catch (error) {
      if (error !== reason) throw error;
    }
    replacement.resolve();
    if (await released.promise !== reason) throw new Error("Late body lost cancellation reason");
  });
}
