import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "patch", label: "Patches" },
  { value: "skins", label: "New Skins" },
  { value: "events", label: "Events" },
  { value: "tournaments", label: "Tournaments" },
  { value: "guides", label: "Guides" },
];

export default function NewsPage() {
  const [category, setCategory] = useState("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-articles", category],
    queryFn: async () => {
      let query = supabase
        .from("news_articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (category !== "all") query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Newspaper className="h-7 w-7 text-primary" /> FreeFire News
        </h1>
        <p className="text-muted-foreground mt-1">Stay updated with the latest FreeFire news, patches, and events</p>
      </motion.div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            className="cursor-pointer font-display text-xs px-3 py-1.5"
            onClick={() => setCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl glass glass-border animate-pulse" />
          ))}
        </div>
      ) : !articles?.length ? (
        <div className="text-center py-20">
          <Newspaper className="h-16 w-16 mx-auto text-muted-foreground/20" />
          <p className="text-muted-foreground mt-4">No articles yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article: any, i: number) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass glass-border hover:border-primary/40 transition-all cursor-pointer overflow-hidden group h-full">
                {article.cover_image && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-display text-[10px] capitalize">
                      {article.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.content.slice(0, 150)}...
                  </p>
                  <div className="flex items-center gap-1 text-primary text-sm font-display">
                    Read More <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
