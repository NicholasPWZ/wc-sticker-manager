STICKERS = {
    "FWC (Especiais  Logos)": {"code": "fwc", "count": 20},
    "MEX (México)": {"code": "mx", "count": 20},
    "RSA (África do Sul)": {"code": "za", "count": 20},
    "KOR (Coreia do Sul)": {"code": "kr", "count": 20},
    "CZE (Chéquia)": {"code": "cz", "count": 20},
    "CAN (Canadá)": {"code": "ca", "count": 20},
    "BIH (Bósnia e Herzegovina)": {"code": "ba", "count": 20},
    "QAT (Catar)": {"code": "qa", "count": 20},
    "SUI (Suíça)": {"code": "ch", "count": 20},
    "BRA (Brasil)": {"code": "br", "count": 20},
    "MAR (Marrocos)": {"code": "ma", "count": 20},
    "HAI (Haiti)": {"code": "ht", "count": 20},
    "SCO (Escócia)": {"code": "gb-sct", "count": 20},
    "USA (Estados Unidos)": {"code": "us", "count": 20},
    "PAR (Paraguai)": {"code": "py", "count": 20},
    "AUS (Austrália)": {"code": "au", "count": 20},
    "TUR (Turquia)": {"code": "tr", "count": 20},
    "GER (Alemanha)": {"code": "de", "count": 20},
    "CUW (Curaçao)": {"code": "cw", "count": 20},
    "CIV (Costa do Marfim)": {"code": "ci", "count": 20},
    "ECU (Equador)": {"code": "ec", "count": 20},
    "NED (Países Baixos)": {"code": "nl", "count": 20},
    "JPN (Japão)": {"code": "jp", "count": 20},
    "SWE (Suécia)": {"code": "se", "count": 20},
    "TUN (Tunísia)": {"code": "tn", "count": 20},
    "BEL (Bélgica)": {"code": "be", "count": 20},
    "EGY (Egito)": {"code": "eg", "count": 20},
    "IRA (Irã)": {"code": "ir", "count": 20},
    "NZL (Nova Zelândia)": {"code": "nz", "count": 20},
    "ESP (Espanha)": {"code": "es", "count": 20},
    "CPE (Cabo Verde)": {"code": "cv", "count": 20},
    "ARS (Arábia Saudita)": {"code": "sa", "count": 20},
    "URU (Uruguai)": {"code": "uy", "count": 20},
    "FRA (França)": {"code": "fr", "count": 20},
    "SEN (Senegal)": {"code": "sn", "count": 20},
    "IRQ (Iraque)": {"code": "iq", "count": 20},
    "NOR (Noruega)": {"code": "no", "count": 20},
    "ARG (Argentina)": {"code": "ar", "count": 20},
    "ALG (Argélia)": {"code": "dz", "count": 20},
    "AUT (Áustria)": {"code": "at", "count": 20},
    "JOR (Jordânia)": {"code": "jo", "count": 20},
    "POR (Portugal)": {"code": "pt", "count": 20},
    "CON (Congo)": {"code": "cg", "count": 20},
    "UZB (Uzbequistão)": {"code": "uz", "count": 20},
    "COL (Colômbia)": {"code": "co", "count": 20},
    "ING (Inglaterra)": {"code": "gb-eng", "count": 20},
    "CRO (Croácia)": {"code": "hr", "count": 20},
    "GAN (Gana)": {"code": "gh", "count": 20},
    "PAN (Panamá)": {"code": "pa", "count": 20},
    "Coca-Cola": {"code": "coca", "count": 14},
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
