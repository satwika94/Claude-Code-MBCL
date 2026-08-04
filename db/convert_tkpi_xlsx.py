import json
import re

with open("/home/claude/nutrition-app/db/foods_data.json", encoding="utf-8") as f:
    existing_data = json.load(f)

# ------------------------------------------------------------------
# Kata kunci untuk kategorisasi otomatis + flag vegetarian/vegan
# Urutan pengecekan penting: dari yang paling spesifik ke paling umum
# ------------------------------------------------------------------

NON_VEGAN_ANIMAL = [
    "ayam", "sapi", "babi", "kambing", "domba", "bebek", "itik", "kerbau",
    "kuda", "kelinci", "angsa", "kalkun", "rusa", "menjangan", "kancil",
    "ikan", "udang", "kepiting", "cumi", "kerang", "lokan", "keong",
    "tiram", "kodok", "penyu", "kura-kura", "belut", "gurita", "teripang",
    "daging", "hati", "usus", "babat", "jeroan", "ampela", "otak", "paru",
    "ginjal", "lidah", "kulit ayam", "kulit sapi", "sosis", "bakso",
    "kornet", "ham", "nugget", "dendeng", "abon", "rendang", "empal",
    "sate", "gulai", "opor", "rica", "kikil", "tunjang", "iga", "torpedo",
    "burung", "puyuh", "merpati", "rebon", "terasi", "trasi", "ebi",
    "gelatin", "gelatine", "ulat", "jangkrik", "belalang", "kroto",
    "laron", "tokek", "tikus", "biawak",
    "beef", "chicken", "pork", "duck", "lamb", "bacon", "steak", "burger",
    "meatball", "sausage", "mutton", "veal", "turkey", "yakiniku",
    "teriyaki", "bulgogi", "wagyu",
]
DAIRY_EGG = [
    "telur", "susu", "keju", "yoghurt", "yogurt", "mentega", "kepala susu",
    "krim", "custard", "es krim", "hangop", "kwark", "madu",
]
KARBOHIDRAT_KW = [
    "beras", "nasi", "jagung", "mie", "mi ", "bihun", "kwetiau", "roti",
    "gandum", "terigu", "oat", "sagu", "pasta", "makaroni", "spageti",
    "singkong", "ubi", "kentang", "talas", "gembili", "gadung", "sukun",
    "ganyong", "garut", "sorgum", "jali", "jawawut",
]
KACANG_KW = ["kacang", "kedelai", "tempe", "tahu", "oncom", "koro", "kenari", "mete", "almond"]
SAYUR_KW = ["sayur", "bayam", "kangkung", "kol", "sawi", "brokoli", "wortel",
            "buncis", "terong", "timun", "tomat", "labu", "kubis", "selada",
            "jamur", "daun", "kecambah", "tauge", "genjer", "pare", "rebung",
            "kembang kol", "seledri", "kucai", "kailan"]
BUAH_KW = ["pisang", "apel", "jeruk", "mangga", "pepaya", "semangka", "melon",
           "nanas", "alpukat", "anggur", "jambu", "salak", "rambutan", "duku",
           "sirsak", "belimbing", "kelengkeng", "kurma", "kiwi", "strawberry",
           "nangka", "durian", "manggis", "duren", "sawo", "markisa", "kedondong"]
LEMAK_KW = ["minyak", "santan", "margarin", "lemak", "gajih"]
CAMILAN_KW = [
    # jajan pasar tradisional
    "keripik", "kripik", "ceriping", "criping", "kerupuk", "krupuk",
    "emping", "rengginang", "opak", "kue", "dodol", "wajik", "jenang",
    "getuk", "cenil", "lupis", "klepon", "onde", "combro", "misro",
    "nagasari", "lemper", "lapis legit", "bolu", "brownis", "brownies",
    "donat", "pukis", "serabi", "apem", "putu", "martabak", "gemblong",
    "bagea", "geplak", "geblek", "enting-enting", "intip", "wingko",
    "sagon", "bika ambon", "tape", "kembang goyang", "kipang", "rambak",
    "peuyeum", "kolak", "sale pisang",
    # cemilan/permen/coklat kemasan
    "wafer", "biskuit", "kukis", "cookies", "permen", "manisan",
    "gula-gula", "coklat batang", "cokelat batang", "coklat susu",
    "coklat manis", "coklat pahit", "serbuk coklat", "coklat bubuk",
    "astor", "stik keju", "pilus", "cimol", "cireng", "cilok",
    "risoles", "pastel", "lumpia", "roti bakar", "snack",
    "kacang telur", "kacang atom", "kacang bawang",
]

MINUMAN_KW = ["air kelapa", "teh", "kopi", "jus", "sirup", "minuman", "es "]
BUMBU_KW = ["bawang", "kunyit", "jahe", "kecap", "saus", "garam", "gula",
            "merica", "cabai", "ketumbar", "ketupat", "terasi", "cuka", "kemiri"]


def _matches(keywords, n):
    for kw in keywords:
        if " " in kw:
            if kw in n:
                return True
        else:
            if re.search(r"\b" + re.escape(kw) + r"\b", n):
                return True
    return False


def classify(name: str):
    n = name.lower()

    is_animal = _matches(NON_VEGAN_ANIMAL, n)
    is_dairy_egg = _matches(DAIRY_EGG, n)

    # Prioritas flag: telur/susu diperiksa LEBIH DULU agar "susu sapi" / "telur
    # ayam" tidak ikut ke aturan daging hanya karena mengandung nama hewan.
    if is_dairy_egg:
        is_vegetarian, is_vegan = 1, 0
    elif is_animal:
        is_vegetarian, is_vegan = 0, 0
    else:
        is_vegetarian, is_vegan = 1, 1

    # Prioritas kategori: lemak/minyak & kelompok bahan mentah lain diperiksa
    # LEBIH DULU, supaya "minyak ikan"/"lemak babi" tetap masuk kategori
    # "lemak", bukan "protein_hewani" hanya karena menyebut nama hewan.
    if _matches(LEMAK_KW, n):
        category = "lemak"
    elif _matches(CAMILAN_KW, n):
        category = "camilan"
    elif _matches(KARBOHIDRAT_KW, n):
        category = "karbohidrat"
    elif _matches(KACANG_KW, n):
        category = "protein_nabati"
    elif _matches(SAYUR_KW, n):
        category = "sayur"
    elif _matches(BUAH_KW, n):
        category = "buah"
    elif _matches(MINUMAN_KW, n):
        category = "minuman"
    elif _matches(BUMBU_KW, n):
        category = "bumbu"
    elif is_dairy_egg or is_animal:
        category = "protein_hewani"
    else:
        category = "olahan"

    return category, is_vegetarian, is_vegan


records = []
seen_names = set()
for row in existing_data:
    name = str(row["name"]).strip()
    name = re.sub(r"\s{2,}", " ", name)
    if not name or name.lower() == "nan":
        continue
    key = name.lower()
    if key in seen_names:
        continue  # lewati duplikat (case-insensitive)
    seen_names.add(key)

    cal = row["calories_per_100g"]
    prot = row["protein_per_100g"]
    fat = row["fat_per_100g"]
    carb = row["carb_per_100g"]

    category, is_veg, is_vgn = classify(name)

    records.append({
        "name": name,
        "category": category,
        "calories_per_100g": cal,
        "protein_per_100g": prot,
        "fat_per_100g": fat,
        "carb_per_100g": carb,
        "is_vegetarian": is_veg,
        "is_vegan": is_vgn,
    })

print(f"Total record valid: {len(records)} (dari {len(existing_data)} baris asli)")

from collections import Counter
cat_counts = Counter(r["category"] for r in records)
for cat, n in sorted(cat_counts.items(), key=lambda x: -x[1]):
    print(f"  {cat}: {n}")

with open("foods_data_tkpi.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("\nSelesai -> foods_data_tkpi.json")
