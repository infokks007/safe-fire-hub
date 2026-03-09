import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flame, ArrowLeft, Upload, X, Film, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RANKS = ["Bronze", "Silver", "Gold", "Diamond", "Heroic"];
const REGIONS = ["India", "Brazil", "Indonesia", "Thailand", "Vietnam", "Middle East", "Europe", "North America"];

export default function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    freefire_uid: "",
    level: "",
    rank: "",
    region: "",
    elite_pass: false,
    evo_guns: "",
    gun_skins: "",
    bundles: "",
    characters: "",
  });

  const [priceEstimate, setPriceEstimate] = useState<{ min_price: number; max_price: number; confidence: number; reasoning: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is too large (max 20MB)`); return false; }
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) { toast.error(`${f.name} is not valid`); return false; }
      return true;
    });
    if (mediaFiles.length + validFiles.length > 10) { toast.error("Maximum 10 files"); return; }
    setMediaFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => setMediaPreviews((prev) => [...prev, URL.createObjectURL(file)]));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (!user || mediaFiles.length === 0) return [];
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("listing-media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("listing-media").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const estimatePrice = async () => {
    setAiLoading("price");
    try {
      const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("ai-tools", {
        body: {
          action: "estimate_price",
          payload: {
            level: form.level ? parseInt(form.level) : null,
            rank: form.rank || null,
            evo_guns: toArray(form.evo_guns),
            gun_skins: toArray(form.gun_skins),
            bundles: toArray(form.bundles),
            characters: toArray(form.characters),
            elite_pass: form.elite_pass,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPriceEstimate(data);
      toast.success("Price estimate ready!");
    } catch (err: any) {
      toast.error(err.message || "Failed to estimate price");
    } finally {
      setAiLoading(null);
    }
  };

  const generateDescription = async () => {
    setAiLoading("description");
    try {
      const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("ai-tools", {
        body: {
          action: "generate_description",
          payload: {
            title: form.title,
            level: form.level ? parseInt(form.level) : null,
            rank: form.rank || null,
            evo_guns: toArray(form.evo_guns),
            gun_skins: toArray(form.gun_skins),
            bundles: toArray(form.bundles),
            characters: toArray(form.characters),
            elite_pass: form.elite_pass,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
        toast.success("Description generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate description");
    } finally {
      setAiLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);
      const imageUrls = await uploadMedia();
      const { error } = await supabase.from("listings").insert({
        seller_id: user.id,
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        freefire_uid: form.freefire_uid || null,
        level: form.level ? parseInt(form.level) : null,
        rank: form.rank || null,
        region: form.region || null,
        elite_pass: form.elite_pass,
        evo_guns: toArray(form.evo_guns),
        gun_skins: toArray(form.gun_skins),
        bundles: toArray(form.bundles),
        characters: toArray(form.characters),
        images: imageUrls.length > 0 ? imageUrls : null,
      } as any);
      if (error) throw error;

      // Run scam detection in background
      supabase.functions.invoke("ai-tools", {
        body: {
          action: "detect_scam",
          payload: {
            title: form.title,
            description: form.description,
            price: parseFloat(form.price),
            level: form.level ? parseInt(form.level) : null,
            rank: form.rank,
          },
        },
      }).then(({ data }) => {
        if (data?.is_suspicious) {
          // Flag the listing - this runs asynchronously
          console.log("Listing flagged for review:", data.reasons);
        }
      });

      toast.success("Listing created!");
      navigate("/dashboard/listings");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-display">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <CardTitle className="font-display text-2xl">Create Listing</CardTitle>
          </div>
          <CardDescription>Fill in details about the FreeFire account you're selling</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input name="title" id="title" value={form.title} onChange={handleChange} placeholder="e.g. Max Level FF Account with Rare Bundles" required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-primary font-display"
                  onClick={generateDescription}
                  disabled={aiLoading === "description"}
                >
                  {aiLoading === "description" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Generate
                </Button>
              </div>
              <Textarea name="description" id="description" value={form.description} onChange={handleChange} placeholder="Describe the account..." rows={3} />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Photos & Videos</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload (max 10 files, 20MB each)</p>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
              </div>
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {mediaPreviews.map((preview, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted">
                      {mediaFiles[i]?.type.startsWith("video/") ? (
                        <div className="flex items-center justify-center h-full"><Film className="h-8 w-8 text-muted-foreground" /></div>
                      ) : (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[10px] text-primary font-display h-6 px-2"
                    onClick={estimatePrice}
                    disabled={aiLoading === "price"}
                  >
                    {aiLoading === "price" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Estimate
                  </Button>
                </div>
                <Input name="price" id="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} placeholder="29.99" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freefire_uid">FreeFire UID</Label>
                <Input name="freefire_uid" id="freefire_uid" value={form.freefire_uid} onChange={handleChange} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Account Level</Label>
                <Input name="level" id="level" type="number" min="1" value={form.level} onChange={handleChange} placeholder="70" />
              </div>
            </div>

            {/* AI Price Estimate Display */}
            <AnimatePresence>
              {priceEstimate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass glass-border rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-display font-semibold text-sm">AI Price Estimate</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-display font-bold text-primary">
                      ${priceEstimate.min_price} – ${priceEstimate.max_price}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(priceEstimate.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{priceEstimate.reasoning}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-display"
                    onClick={() => {
                      const avg = ((priceEstimate.min_price + priceEstimate.max_price) / 2).toFixed(2);
                      setForm((prev) => ({ ...prev, price: avg }));
                    }}
                  >
                    Use Average (${((priceEstimate.min_price + priceEstimate.max_price) / 2).toFixed(2)})
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rank</Label>
                <Select value={form.rank} onValueChange={(v) => setForm((p) => ({ ...p, rank: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm((p) => ({ ...p, region: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between glass glass-border rounded-lg p-3">
              <Label className="font-display text-sm">Elite Pass Ownership</Label>
              <Switch checked={form.elite_pass} onCheckedChange={(v) => setForm((p) => ({ ...p, elite_pass: v }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evo_guns">Evo Guns (comma-separated)</Label>
                <Input name="evo_guns" id="evo_guns" value={form.evo_guns} onChange={handleChange} placeholder="M1887, AK47" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gun_skins">Gun Skins (comma-separated)</Label>
                <Input name="gun_skins" id="gun_skins" value={form.gun_skins} onChange={handleChange} placeholder="Dragon AK, Blue Flame" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bundles">Bundles (comma-separated)</Label>
                <Input name="bundles" id="bundles" value={form.bundles} onChange={handleChange} placeholder="Criminal, Hip Hop" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="characters">Characters (comma-separated)</Label>
                <Input name="characters" id="characters" value={form.characters} onChange={handleChange} placeholder="Alok, Chrono, K" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full font-display text-lg glow-flame">
              {loading ? "Creating..." : "Publish Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
