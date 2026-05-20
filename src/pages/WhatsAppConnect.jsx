import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Wifi, WifiOff, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WhatsAppConnect() {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState(null); // 'open' | 'close' | null
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const fetchQR = async () => {
    setLoading(true);
    setQrCode(null);
    try {
      const res = await base44.functions.invoke("getQRCode", {});
      const data = res.data;
      if (data?.instance?.state === "open") {
        setStatus("open");
      } else if (data?.base64) {
        setQrCode(data.base64);
        setStatus("close");
      } else {
        setStatus("close");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const restartAndGetQR = async () => {
    setRestarting(true);
    setQrCode(null);
    setStatus(null);
    try {
      const res = await base44.functions.invoke("restartInstance", {});
      const data = res.data;
      if (data?.base64) {
        setQrCode(data.base64);
        setStatus("close");
      } else if (data?.instance?.state === "open") {
        setStatus("open");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center bg-[#075e54] rounded-t-lg">
          <CardTitle className="text-white text-xl">Conectar WhatsApp</CardTitle>
          <p className="text-white/70 text-sm">Instância: meudelivery</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">

          {status === "open" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold text-green-700">WhatsApp Conectado!</p>
              <p className="text-sm text-gray-500">A sessão está ativa e funcionando.</p>
              <Link to="/">
                <Button className="bg-[#075e54] hover:bg-[#054d44] text-white">
                  Ir para o Chat
                </Button>
              </Link>
            </div>
          )}

          {status === "close" && !qrCode && (
            <div className="flex flex-col items-center gap-3 py-6">
              <WifiOff className="w-16 h-16 text-red-400" />
              <p className="text-lg font-semibold text-red-600">Sessão Encerrada</p>
              <p className="text-sm text-gray-500 text-center">
                Clique em "Reconectar" para gerar um novo QR Code.
              </p>
            </div>
          )}

          {qrCode && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-700">
                Escaneie com o WhatsApp no celular:
              </p>
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 border rounded-lg shadow"
              />
              <p className="text-xs text-gray-400 text-center">
                WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
              </p>
              <Button variant="outline" size="sm" onClick={fetchQR} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Atualizar QR
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={fetchQR}
              disabled={loading || restarting}
              variant="outline"
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
              Verificar Status
            </Button>
            <Button
              onClick={restartAndGetQR}
              disabled={loading || restarting}
              className="w-full bg-[#075e54] hover:bg-[#054d44] text-white"
            >
              {restarting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {restarting ? "Reconectando..." : "Reconectar (gerar novo QR)"}
            </Button>
          </div>

          <div className="text-center pt-2">
            <Link to="/" className="text-sm text-[#075e54] hover:underline">
              ← Voltar ao Chat
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}