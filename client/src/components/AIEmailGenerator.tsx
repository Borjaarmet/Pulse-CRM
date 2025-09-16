import React, { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Sparkles, 
  Send, 
  Copy, 
  RefreshCw, 
  Mail, 
  Clock,
  TrendingUp,
  Target,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Deal, Contact } from "@/lib/types";

interface AIEmailGeneratorProps {
  deal?: Deal;
  contact?: Contact;
  trigger?: React.ReactNode;
}

const EMAIL_TEMPLATES = {
  seguimiento: {
    name: "Seguimiento General",
    prompt: "seguimiento profesional y cálido",
    icon: Clock,
    color: "bg-blue-500"
  },
  propuesta: {
    name: "Envío de Propuesta", 
    prompt: "presentación de propuesta comercial",
    icon: TrendingUp,
    color: "bg-green-500"
  },
  reactivacion: {
    name: "Reactivación de Deal",
    prompt: "reactivación de oportunidad fría",
    icon: Target,
    color: "bg-orange-500"
  },
  urgente: {
    name: "Seguimiento Urgente",
    prompt: "seguimiento urgente para deal en riesgo",
    icon: AlertCircle,
    color: "bg-red-500"
  }
};

// Mock AI responses - En producción sería OpenAI API
const MOCK_EMAIL_RESPONSES = {
  seguimiento: `Estimado/a {contactName},

Espero que se encuentre muy bien. Me pongo en contacto para hacer seguimiento de nuestra conversación sobre {dealTitle}.

Hemos revisado los requerimientos que me comentó y creemos que nuestra solución puede aportar un valor significativo a {company}, especialmente en términos de eficiencia operativa y ahorro de costos.

¿Podríamos agendar una reunión de 30 minutos esta semana para presentarle una propuesta personalizada? Tengo disponibilidad el martes y jueves por la mañana.

Quedo atento a su respuesta.

Saludos cordiales,
{userName}`,

  propuesta: `Estimado/a {contactName},

Como acordamos en nuestra última reunión, adjunto la propuesta comercial para {dealTitle} en {company}.

La propuesta incluye:
• Análisis detallado de sus necesidades
• Solución personalizada con ROI proyectado
• Cronograma de implementación
• Precio especial válido hasta {deadline}

Nuestra solución puede generar un ahorro del 25% en sus procesos actuales y un ROI del 300% en el primer año.

¿Podríamos reunirnos el {suggestedDate} para revisar los detalles y resolver cualquier duda?

Saludos,
{userName}`,

  reactivacion: `Hola {contactName},

Hace tiempo que no tenemos contacto y quería retomar nuestra conversación sobre {dealTitle} para {company}.

Entiendo que las prioridades pueden cambiar, pero me gustaría saber si aún existe interés en optimizar {focusArea}. Hemos desarrollado nuevas funcionalidades que podrían ser muy relevantes para su situación actual.

¿Tendría 15 minutos para una llamada rápida esta semana? Sin compromiso, solo para ponernos al día y ver si podemos ser de ayuda.

¡Espero saber de usted pronto!

Saludos,
{userName}`,

  urgente: `Estimado/a {contactName},

Espero que esté bien. Noto que nuestro proceso para {dealTitle} lleva algunas semanas sin avances y quería asegurarme de que todo esté en orden.

¿Ha surgido algún obstáculo que podamos ayudar a resolver? Estamos aquí para apoyarle en lo que necesite para que este proyecto sea un éxito.

La propuesta sigue vigente hasta {deadline}, y estaríamos encantados de hacer los ajustes necesarios.

¿Podríamos hablar mañana? Solo 10 minutos para entender cómo podemos avanzar juntos.

Quedo pendiente,
{userName}`
};

export default function AIEmailGenerator({ deal, contact, trigger }: AIEmailGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("seguimiento");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  
  const { toast } = useToast();

  const generateEmail = async () => {
    setIsGenerating(true);
    
    // Simular llamada a IA (en producción sería OpenAI)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const template = EMAIL_TEMPLATES[selectedTemplate];
    let emailContent = MOCK_EMAIL_RESPONSES[selectedTemplate];
    
    // Personalizar con datos reales
    const contactName = contact?.name || "Cliente";
    const dealTitle = deal?.title || "nuestro proyecto";
    const company = deal?.company || contact?.company || "su empresa";
    const userName = "Equipo Comercial"; // En producción sería el usuario actual
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES");
    const suggestedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES");
    const focusArea = deal?.stage === "Prospección" ? "sus procesos comerciales" : 
                     deal?.stage === "Propuesta" ? "la optimización de costos" : "la eficiencia operativa";

    emailContent = emailContent
      .replace(/{contactName}/g, contactName)
      .replace(/{dealTitle}/g, dealTitle)
      .replace(/{company}/g, company)
      .replace(/{userName}/g, userName)
      .replace(/{deadline}/g, deadline)
      .replace(/{suggestedDate}/g, suggestedDate)
      .replace(/{focusArea}/g, focusArea);

    // Generar subject line
    const subjects = {
      seguimiento: `Seguimiento ${dealTitle} - ${company}`,
      propuesta: `Propuesta comercial - ${dealTitle}`,
      reactivacion: `¿Seguimos interesados en ${dealTitle}?`,
      urgente: `URGENTE: ${dealTitle} - ¿Podemos hablar?`
    };
    
    setEmailSubject(subjects[selectedTemplate]);
    setGeneratedEmail(emailContent);
    setIsGenerating(false);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Email copiado al portapapeles",
    });
  };

  const resetGenerator = () => {
    setGeneratedEmail("");
    setEmailSubject("");
    setCustomPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Email con IA
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generador de Emails con IA
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator">🤖 Generar Email</TabsTrigger>
            <TabsTrigger value="preview">📧 Vista Previa</TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-4">
            {/* Deal/Contact Info */}
            {(deal || contact) && (
              <Card className="p-4 bg-muted/50">
                <h4 className="font-medium mb-2">📋 Información del contexto:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {deal && (
                    <>
                      <div><strong>Deal:</strong> {deal.title}</div>
                      <div><strong>Empresa:</strong> {deal.company}</div>
                      <div><strong>Valor:</strong> €{deal.amount?.toLocaleString()}</div>
                      <div><strong>Etapa:</strong> {deal.stage}</div>
                      <div><strong>Probabilidad:</strong> {deal.probability}%</div>
                      <div><strong>Próximo paso:</strong> {deal.next_step || "No definido"}</div>
                    </>
                  )}
                  {contact && (
                    <>
                      <div><strong>Contacto:</strong> {contact.name}</div>
                      <div><strong>Email:</strong> {contact.email}</div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">🎯 Tipo de email:</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(key as keyof typeof EMAIL_TEMPLATES)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === key 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded ${template.color}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.prompt}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">✨ Instrucciones adicionales (opcional):</label>
              <Textarea
                placeholder="Ej: Mencionar la promoción del 20%, enfoque en ROI, tono más formal..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateEmail}
              disabled={isGenerating}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Email Personalizado
                </>
              )}
            </Button>

            {/* Fun AI status */}
            {isGenerating && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span>IA analizando contexto y generando email personalizado...</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {generatedEmail ? (
              <div className="space-y-4">
                {/* Subject Line */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">📧 Asunto:</label>
                  <div className="flex gap-2">
                    <Input 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(emailSubject)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Email Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">📝 Contenido del email:</label>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        Generado con IA
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(generatedEmail)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea 
                    value={generatedEmail}
                    onChange={(e) => setGeneratedEmail(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={resetGenerator} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Generar Otro
                  </Button>
                  <Button 
                    onClick={() => {
                      copyToClipboard(`${emailSubject}\n\n${generatedEmail}`);
                      setOpen(false);
                    }}
                    className="gap-2 flex-1"
                  >
                    <Send className="h-4 w-4" />
                    Copiar y Usar
                  </Button>
                </div>

                {/* AI Tips */}
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary mb-1">💡 Consejos de IA:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Personaliza el saludo con información específica del cliente</li>
                        <li>• Menciona beneficios concretos según su industria</li>
                        <li>• Incluye una llamada a la acción clara y específica</li>
                        <li>• Mantén un tono profesional pero cercano</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Primero genera un email en la pestaña "Generar Email"</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
