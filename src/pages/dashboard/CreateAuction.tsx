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
import { Gavel, ArrowLeft, Upload, X, Film } from "lucide-react";

const RANKS = ["Bronze", "Silver", "Gold", "Diamond", "Heroic"];
const REGIONS = ["India", "Brazil", "Indonesia", "Thailand", "Vietnam", "Middle East", "Europe", "North America"];
const DURATIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
];

export default function CreateAuction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    starting_price: "",
    freefire_uid: "",
    level: "",
    rank: "",
    region: "",
    elite_pass: false,
    evo_guns: "",
    gun_skins: "",
    bundles: "",
    characters: "",
    duration_minutes: 30,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} too large`); return false; }
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) { toast.error(`${f.name} invalid`); return false; }
      return true;
    });
    if (mediaFiles.length + validFiles.length > 10) { toast.error("Max 10 files"); return; }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);
      const imageUrls = await uploadMedia();
      const startingPrice = parseFloat(form.starting_price);
      const endsAt = new Date(Date.now() + form.duration_minutes * 60 * 1000).toISOString();

      const { error } = await supabase.from("auctions").insert({
        seller_id: user.id,
        title: form.title,
        description: form.description || null,
        starting_price: startingPrice,
        current_price: startingPrice,
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
        duration_minutes: form.duration_minutes,
        ends_at: endsAt,
      } as any);
      if (error) throw error;
      toast.success("Auction created! 🔥");
      navigate("/dashboard/auctions");
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
            <Gavel className="h-6 w-6 text-primary" />
            <CardTitle className="font-display text-2xl">Create Auction</CardTitle>
          </div>
          <CardDescription>Set up an auction for your FreeFire account. Buyers will bid live!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input name="title" id="title" value={form.title} onChange={handleChange} placeholder="e.g. Rare FF Account Auction" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" id="description" value={form.description} onChange={handleChange} placeholder="Describe the account..." rows={3} />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Photos & Videos</Label>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
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
                <Label htmlFor="starting_price">Starting Price (₹) *</Label>
                <Input name="starting_price" id="starting_price" type="number" min="1" step="1" value={form.starting_price} onChange={handleChange} placeholder="100" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freefire_uid">FreeFire UID</Label>
                <Input name="freefire_uid" id="freefire_uid" value={form.freefire_uid} onChange={handleChange} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label>Auction Duration *</Label>
                <Select value={String(form.duration_minutes)} onValueChange={(v) => setForm((p) => ({ ...p, duration_minutes: parseInt(v) }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Account Level</Label>
                <Input name="level" id="level" type="number" min="1" value={form.level} onChange={handleChange} placeholder="70" />
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <Select value={form.rank} onValueChange={(v) => setForm((p) => ({ ...p, rank: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Select rank" /></SelectTrigger>
                  <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm((p) => ({ ...p, region: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
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
              {loading ? "Creating Auction..." : "🔥 Start Auction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
