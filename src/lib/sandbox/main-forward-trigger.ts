import { len } from '../utils';
import { MainWindow, PartytownWebWorker, WinId, WorkerMessageType } from '../types';
import { serializeForWorker } from './main-serialization';

export const mainForwardTrigger = (worker: PartytownWebWorker, $winId$: WinId, win: MainWindow) => {
  let queuedForwardCalls = win._ptf;
  let forwards = (win.partytown || {}).forward || [];
  let i: number;
  let mainForwardFn: any;

  let forwardCall = ($forward$: string[], args: any) => {
    // bad hack to "push" the datas inside the dataLayer
    if ($forward$[0] === 'dataLayer' && $forward$[1] === 'push') {
      win.dataLayer = win.dataLayer || [];
      win.dataLayer.splice(win.dataLayer.length, 0, args[0]);
    }
    return worker.postMessage([
      WorkerMessageType.ForwardMainTrigger,
      {
        $winId$,
        $forward$,
        $args$: serializeForWorker($winId$, Array.from(args)),
      },
    ]);
  }

  win._ptf = undefined;

  forwards.map((forwardProps) => {
    mainForwardFn = win;
    forwardProps.split('.').map((_, i, arr) => {
      mainForwardFn = mainForwardFn[arr[i]] =
        i + 1 < len(arr)
          ? mainForwardFn[arr[i]] || (arr[i + 1] === 'push' ? [] : {})
          : (...args: any) => forwardCall(arr, args);
    });
  });

  if (queuedForwardCalls) {
    for (i = 0; i < len(queuedForwardCalls); i += 2) {
      forwardCall(queuedForwardCalls[i], queuedForwardCalls[i + 1]);
    }
  }
};
