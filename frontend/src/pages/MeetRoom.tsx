import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { joinMeeting, leaveMeeting } from "@/services/meetings";

type Peer = { id: number; stream?: MediaStream };

export default function MeetRoom() {
  const { code } = useParams();
  const [peers, setPeers] = useState<Record<number, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.hostname;
    const port = 8089; // keep in sync with backend
    return `${proto}://${host}:${port}`;
  }, []);

  useEffect(() => {
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      await joinMeeting(code!);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', code }));
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'peers') {
          const existing: number[] = msg.peers.filter((id: number) => id !== (ws as any).resourceId);
          for (const peerId of existing) {
            await createOffer(peerId, ws);
          }
        }
        if (msg.type === 'peer-joined') {
          const peerId = msg.peerId as number;
          await createOffer(peerId, ws);
        }
        if (msg.type === 'signal') {
          const fromId = msg.from as number;
          const signal = msg.signal;
          await handleSignal(fromId, signal, ws);
        }
      };
    })();

    return () => {
      leaveMeeting(code!);
      wsRef.current?.close();
      Object.values(peers).forEach(pc => pc.close());
      localStream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const getPeer = (peerId: number) => {
    if (peers[peerId]) return peers[peerId];
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ]
    });
    if (localStream) {
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }
    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        wsRef.current?.send(JSON.stringify({ type: 'signal', code, payload: { to: peerId, signal: { candidate: ev.candidate } } }));
      }
    };
    setPeers(prev => ({ ...prev, [peerId]: pc }));
    return pc;
  };

  const createOffer = async (peerId: number, ws: WebSocket) => {
    const pc = getPeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'signal', code, payload: { to: peerId, signal: { sdp: offer } } }));
  };

  const handleSignal = async (fromId: number, signal: any, ws: WebSocket) => {
    const pc = getPeer(fromId);
    if (signal.sdp) {
      const desc = new RTCSessionDescription(signal.sdp);
      await pc.setRemoteDescription(desc);
      if (desc.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'signal', code, payload: { to: fromId, signal: { sdp: answer } } }));
      }
    } else if (signal.candidate) {
      try { await pc.addIceCandidate(signal.candidate); } catch {}
    }
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto]">
      <div className="p-3 border-b flex items-center gap-2">
        <div className="font-semibold">Meeting {code}</div>
      </div>
      <div className="p-3 grid md:grid-cols-2 gap-3 overflow-auto">
        <div className="aspect-video bg-black rounded overflow-hidden">
          {localStream && <video autoPlay muted playsInline ref={(el) => { if (el && localStream) el.srcObject = localStream; }} className="w-full h-full object-cover" />}
        </div>
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div key={peerId} className="aspect-video bg-black rounded overflow-hidden">
            <video autoPlay playsInline ref={(el) => { if (el && stream) el.srcObject = stream; }} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <Button variant="secondary" onClick={() => {
          localStream?.getTracks().forEach(t => t.enabled = !t.enabled);
        }}>Toggle A/V</Button>
      </div>
    </div>
  );
}


