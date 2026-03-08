import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, ArrowLeft } from "lucide-react";

export default function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    freefire_uid: "",
    level: "",
    evo_guns: "",
    gun_skins: "",
    bundles: "",
    characters: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

      const { error } = await supabase.from("listings").insert({
        seller_id: user.id,
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        freefire_uid: form.freefire_uid || null,
        level: form.level ? parseInt(form.level) : null,
        evo_guns: toArray(form.evo_guns),
        gun_skins: toArray(form.gun_skins),
        bundles: toArray(form.bundles),
        characters: toArray(form.characters),
      });

      if (error) throw error;
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
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" id="description" value={form.description} onChange={handleChange} placeholder="Describe the account..." rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD) *</Label>
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
