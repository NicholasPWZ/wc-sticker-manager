STICKERS = {
    "FWC (Especiais  Logos)": {"code": "fwc", "count": 20, "start": 0, "page": None},
    "MEX (México)":            {"code": "mx",     "count": 20, "page": 8},
    "RSA (África do Sul)":     {"code": "za",     "count": 20, "page": 10},
    "KOR (Coreia do Sul)":     {"code": "kr",     "count": 20, "page": 12},
    "CZE (Chéquia)":           {"code": "cz",     "count": 20, "page": 14},
    "CAN (Canadá)":            {"code": "ca",     "count": 20, "page": 16},
    "BIH (Bósnia e Herzegovina)": {"code": "ba",  "count": 20, "page": 18},
    "QAT (Catar)":             {"code": "qa",     "count": 20, "page": 20},
    "SUI (Suíça)":             {"code": "ch",     "count": 20, "page": 22},
    "BRA (Brasil)":            {"code": "br",     "count": 20, "page": 24},
    "MAR (Marrocos)":          {"code": "ma",     "count": 20, "page": 26},
    "HAI (Haiti)":             {"code": "ht",     "count": 20, "page": 28},
    "SCO (Escócia)":           {"code": "gb-sct", "count": 20, "page": 30},
    "USA (Estados Unidos)":    {"code": "us",     "count": 20, "page": 32},
    "PAR (Paraguai)":          {"code": "py",     "count": 20, "page": 34},
    "AUS (Austrália)":         {"code": "au",     "count": 20, "page": 36},
    "TUR (Turquia)":           {"code": "tr",     "count": 20, "page": 38},
    "GER (Alemanha)":          {"code": "de",     "count": 20, "page": 40},
    "CUW (Curaçao)":           {"code": "cw",     "count": 20, "page": 42},
    "CIV (Costa do Marfim)":   {"code": "ci",     "count": 20, "page": 44},
    "ECU (Equador)":           {"code": "ec",     "count": 20, "page": 46},
    "NED (Países Baixos)":     {"code": "nl",     "count": 20, "page": 48},
    "JPN (Japão)":             {"code": "jp",     "count": 20, "page": 50},
    "SWE (Suécia)":            {"code": "se",     "count": 20, "page": 52},
    "TUN (Tunísia)":           {"code": "tn",     "count": 20, "page": 54},
    "BEL (Bélgica)":           {"code": "be",     "count": 20, "page": 58},
    "EGY (Egito)":             {"code": "eg",     "count": 20, "page": 60},
    "IRN (Irã)":               {"code": "ir",     "count": 20, "page": 62},
    "NZL (Nova Zelândia)":     {"code": "nz",     "count": 20, "page": 64},
    "ESP (Espanha)":           {"code": "es",     "count": 20, "page": 66},
    "CPV (Cabo Verde)":        {"code": "cv",     "count": 20, "page": 68},
    "KSA (Arábia Saudita)":    {"code": "sa",     "count": 20, "page": 70},
    "URU (Uruguai)":           {"code": "uy",     "count": 20, "page": 72},
    "FRA (França)":            {"code": "fr",     "count": 20, "page": 74},
    "SEN (Senegal)":           {"code": "sn",     "count": 20, "page": 76},
    "IRQ (Iraque)":            {"code": "iq",     "count": 20, "page": 78},
    "NOR (Noruega)":           {"code": "no",     "count": 20, "page": 80},
    "ARG (Argentina)":         {"code": "ar",     "count": 20, "page": 82},
    "ALG (Argélia)":           {"code": "dz",     "count": 20, "page": 84},
    "AUT (Áustria)":           {"code": "at",     "count": 20, "page": 86},
    "JOR (Jordânia)":          {"code": "jo",     "count": 20, "page": 88},
    "POR (Portugal)":          {"code": "pt",     "count": 20, "page": 90},
    "COD (Congo DR)":          {"code": "cd",     "count": 20, "page": 92},
    "UZB (Uzbequistão)":       {"code": "uz",     "count": 20, "page": 94},
    "COL (Colômbia)":          {"code": "co",     "count": 20, "page": 96},
    "ENG (Inglaterra)":        {"code": "gb-eng", "count": 20, "page": 98},
    "CRO (Croácia)":           {"code": "hr",     "count": 20, "page": 100},
    "GHA (Gana)":              {"code": "gh",     "count": 20, "page": 102},
    "PAN (Panamá)":            {"code": "pa",     "count": 20, "page": 104},
    "Coca-Cola":               {"code": "coca",   "count": 14, "page": None},
}

TOTAL_STICKERS = sum(v["count"] for v in STICKERS.values())  # 994

# Maps 3-letter album code → full country name key (for bulk entry parsing)
CODE_TO_COUNTRY: dict[str, str] = {}
for _name in STICKERS:
    if "(" in _name:
        _code = _name.split("(")[0].strip()
    elif _name == "Coca-Cola":
        _code = "COCA"
    else:
        _code = _name
    CODE_TO_COUNTRY[_code.upper()] = _name

CODE_TO_COUNTRY["CC"] = "Coca-Cola"
