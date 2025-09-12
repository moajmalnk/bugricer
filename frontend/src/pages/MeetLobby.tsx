import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeeting, getMeeting } from "@/services/meetings";

export default function MeetLobby() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createMeeting(title || "BugMeet");
      if (res?.data?.data?.code) {
        navigate(`./${res.data.data.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await getMeeting(code);
      if (res?.data?.success !== false) {
        navigate(`./${code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">BugMeet</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3 p-4 border rounded-lg">
          <h2 className="font-semibold">Start a new meeting</h2>
          <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={handleCreate} disabled={loading}>Create</Button>
        </div>
        <div className="space-y-3 p-4 border rounded-lg">
          <h2 className="font-semibold">Join with code</h2>
          <Input placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Button variant="secondary" onClick={handleJoin} disabled={loading || !code}>Join</Button>
        </div>
      </div>
    </div>
  );
}


