/* FatTrack — Schermate principali */

const FOOD_DB = [
  { id:1,  name:"Petto di pollo",           kcalPer100:165 },
  { id:2,  name:"Fiocchi d'avena",           kcalPer100:368 },
  { id:3,  name:"Uovo intero",               kcalPer100:155 },
  { id:4,  name:"Pasta (secca)",             kcalPer100:352 },
  { id:5,  name:"Riso (secco)",              kcalPer100:360 },
  { id:6,  name:"Salmone fresco",            kcalPer100:208 },
  { id:7,  name:"Manzo magro",               kcalPer100:137 },
  { id:8,  name:"Latte parz. scremato",      kcalPer100:46  },
  { id:9,  name:"Yogurt greco 0%",           kcalPer100:57  },
  { id:10, name:"Banana",                    kcalPer100:89  },
  { id:11, name:"Mela",                      kcalPer100:52  },
  { id:12, name:"Mandorle",                  kcalPer100:579 },
  { id:13, name:"Ricotta",                   kcalPer100:136 },
  { id:14, name:"Pane integrale",            kcalPer100:247 },
  { id:15, name:"Patate lesse",              kcalPer100:77  },
  { id:16, name:"Broccoli",                  kcalPer100:34  },
  { id:17, name:"Tonno in acqua",            kcalPer100:103 },
  { id:18, name:"Olio EVO",                  kcalPer100:884 },
  { id:19, name:"Proteine whey",             kcalPer100:370 },
  { id:20, name:"Quinoa cotta",              kcalPer100:120 },
];

const HISTORY_KCAL = [1820,1950,2200,1680,1900,2150,1780,2030,1650,1920,
                      2080,1750,1840,2180,1990,1720,2050,1880,2240,1700,
                      1960,2100,1800,1930,2160,1750,1870,2020,1940,1638];

function buildHistory() {
  return HISTORY_KCAL.map((kcal, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      kcal,
      dayLabel: d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.',''),
      dateLabel: d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' }),
      isToday: i === 29,
    };
  });
}
const HISTORY_DATA = buildHistory();

// ─── MealSection ─────────────────────────────────────────────
function MealSection({ mealKey, foods, onAddFood, onRemoveFood, onAddFavorite }) {
  const [open, setOpen] = React.useState(true);
  const meta = FT.meal[mealKey];
  const total = foods.reduce((s, f) => s + calcKcal(f.grams, f.kcalPer100), 0);
  return (
    <Card style={{ overflow:'hidden', marginBottom: 10 }}>
      <div onClick={() => setOpen(!open)} style={{
        display:'flex', alignItems:'center', gap:10, padding:'13px 14px',
        cursor:'pointer', background: open ? meta.bg : 'white', transition:'background 0.2s',
      }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:meta.color, flexShrink:0 }}/>
        <span style={{ flex:1, fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{meta.label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:meta.color, fontFamily:FT.font }}>{total} kcal</span>
        {open ? Ico.chevUp(meta.color) : Ico.chevDown(meta.color)}
      </div>
      {open && (
        <div style={{ padding:'0 14px 12px', borderTop:`1px solid ${FT.border}` }}>
          {foods.length === 0 && (
            <p style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font, textAlign:'center', margin:'10px 0 8px', opacity:0.7 }}>
              Nessun alimento registrato
            </p>
          )}
          {foods.map(food => (
            <div key={food.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:`1px solid ${FT.border}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:FT.text, fontFamily:FT.font, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{food.name}</div>
                <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{food.grams}g</div>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:FT.text, fontFamily:FT.font, flexShrink:0 }}>
                {calcKcal(food.grams, food.kcalPer100)} kcal
              </span>
              <button onClick={() => onRemoveFood(food.id)} style={{ border:'none', background:'none', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
                {Ico.trash()}
              </button>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={onAddFood} style={{
              flex:1, height:36, borderRadius:10, background:meta.color, border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              color:'white', fontSize:12, fontWeight:700, fontFamily:FT.font,
            }}>
              {Ico.plus()} Aggiungi
            </button>
            <button onClick={onAddFavorite} style={{
              flex:1, height:36, borderRadius:10, background:meta.bg,
              border:`1.5px solid ${meta.color}40`, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              color:meta.color, fontSize:11, fontWeight:600, fontFamily:FT.font,
            }}>
              {Ico.heart(meta.color)} Dai preferiti
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────
function HomeScreen({ meals, totalKcal, dailyTarget, onAddFood, onRemoveFood }) {
  const remaining = dailyTarget - totalKcal;
  const today = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
  const todayStr = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div style={{ background:FT.bg, minHeight:'100%' }}>
      {/* Header */}
      <div style={{ background:'white', padding:'16px 20px 18px', borderBottom:`1px solid ${FT.border}` }}>
        <p style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font, margin:'0 0 14px', fontWeight:500 }}>{todayStr}</p>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <CalorieRing consumed={totalKcal} target={dailyTarget}/>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Consumate</div>
              <div style={{ fontSize:22, fontWeight:800, color:FT.text, fontFamily:FT.font, lineHeight:1.1 }}>
                {totalKcal.toLocaleString('it-IT')} <span style={{ fontSize:12, fontWeight:500 }}>kcal</span>
              </div>
            </div>
            <div style={{
              background: remaining >= 0 ? FT.greenLight : FT.redLight,
              borderRadius:10, padding:'8px 12px',
              borderLeft:`3px solid ${remaining >= 0 ? FT.green : FT.red}`,
            }}>
              <div style={{ fontSize:10, color:FT.textSec, fontFamily:FT.font, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>
                {remaining >= 0 ? 'Rimanenti' : 'Superate'}
              </div>
              <div style={{ fontSize:18, fontWeight:800, color: remaining >= 0 ? FT.green : FT.red, fontFamily:FT.font }}>
                {Math.abs(remaining).toLocaleString('it-IT')} kcal
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:10, color:FT.textSec, fontFamily:FT.font }}>0</span>
            <span style={{ fontSize:10, color:FT.textSec, fontFamily:FT.font }}>Obiettivo: {dailyTarget.toLocaleString('it-IT')} kcal</span>
          </div>
          <div style={{ background:FT.border, borderRadius:99, height:7, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99,
              width:`${Math.min(totalKcal/dailyTarget*100,100)}%`,
              background: totalKcal > dailyTarget ? FT.red : FT.green,
              transition:'width 0.5s ease',
            }}/>
          </div>
        </div>
      </div>
      {/* Pasti */}
      <div style={{ padding:'14px 14px 0' }}>
        {Object.keys(FT.meal).map(key => (
          <MealSection
            key={key} mealKey={key} foods={meals[key]}
            onAddFood={() => onAddFood(key)}
            onRemoveFood={(id) => onRemoveFood(key, id)}
            onAddFavorite={() => {}}
          />
        ))}
        <div style={{ height:12 }}/>
      </div>
    </div>
  );
}

// ─── AddFoodModal ─────────────────────────────────────────────
function AddFoodModal({ meal, onClose, onAdd }) {
  const [tab, setTab] = React.useState('search');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [grams, setGrams] = React.useState('100');
  const [manual, setManual] = React.useState({ name:'', kcalPer100:'', grams:'' });
  const meta = FT.meal[meal];

  const filtered = query.trim()
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : FOOD_DB.slice(0, 10);

  const manualKcal = manual.kcalPer100 && manual.grams
    ? calcKcal(parseFloat(manual.grams)||0, parseFloat(manual.kcalPer100)||0) : 0;

  const confirmAdd = () => {
    if (!selected) return;
    onAdd({ name:selected.name, kcalPer100:selected.kcalPer100, grams:parseInt(grams)||100 });
  };
  const confirmManual = () => {
    if (!manual.name || !manual.kcalPer100 || !manual.grams) return;
    onAdd({ name:manual.name, kcalPer100:parseFloat(manual.kcalPer100), grams:parseInt(manual.grams) });
  };

  const tabStyle = (t) => ({
    flex:1, padding:'7px 0', border:'none', borderRadius:8, cursor:'pointer', fontFamily:FT.font,
    background: tab===t ? 'white' : 'transparent', boxShadow: tab===t ? FT.shadow : 'none',
    fontSize:12, fontWeight: tab===t ? 700 : 500, color: tab===t ? meta.color : FT.textSec,
    transition:'all 0.15s',
  });

  return (
    <div style={{
      position:'absolute', inset:0, background:'rgba(30,37,50,0.55)',
      display:'flex', alignItems:'flex-end', zIndex:200,
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:'white', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'76%',
        display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,0.18)',
        animation:'slideUp 0.25s ease',
      }}>
        <div style={{ padding:'10px 16px 0' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:FT.border, margin:'0 auto 14px' }}/>
          <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:meta.color, marginRight:8, flexShrink:0 }}/>
            <span style={{ flex:1, fontSize:15, fontWeight:700, color:FT.text, fontFamily:FT.font }}>
              Aggiungi a {meta.label}
            </span>
            <button onClick={onClose} style={{ border:'none', background:FT.bg, borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12, color:FT.textSec, fontFamily:FT.font, fontWeight:600 }}>
              Chiudi
            </button>
          </div>
          <div style={{ display:'flex', gap:3, background:FT.bg, borderRadius:10, padding:3, marginBottom:0 }}>
            <button style={tabStyle('search')} onClick={() => setTab('search')}>Cerca</button>
            <button style={tabStyle('barcode')} onClick={() => setTab('barcode')}>Barcode</button>
            <button style={tabStyle('manual')} onClick={() => setTab('manual')}>Manuale</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 20px' }}>

          {/* TAB CERCA */}
          {tab === 'search' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:FT.bg, borderRadius:12, border:`1.5px solid ${FT.border}`, padding:'9px 12px', marginBottom:12 }}>
                {Ico.search()}
                <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="Cerca alimento..." autoFocus
                  style={{ flex:1, border:'none', background:'none', fontSize:14, color:FT.text, fontFamily:FT.font, outline:'none' }}/>
              </div>
              {selected && (
                <div style={{ background:meta.bg, borderRadius:12, padding:'12px 14px', marginBottom:12, border:`1.5px solid ${meta.color}40` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{selected.name}</div>
                      <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{selected.kcalPer100} kcal/100g</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:meta.color, fontFamily:FT.font }}>
                        {calcKcal(parseInt(grams)||0, selected.kcalPer100)} kcal
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, display:'flex', alignItems:'center', background:'white', borderRadius:10, border:`1.5px solid ${FT.border}`, overflow:'hidden' }}>
                      <input type="number" value={grams} onChange={e => setGrams(e.target.value)}
                        style={{ flex:1, border:'none', background:'none', padding:'8px 12px', fontSize:15, fontWeight:700, color:FT.text, fontFamily:FT.font, outline:'none', width:60 }}/>
                      <span style={{ paddingRight:12, fontSize:12, color:FT.textSec, fontFamily:FT.font }}>g</span>
                    </div>
                    <button onClick={confirmAdd} style={{
                      background:meta.color, color:'white', border:'none', borderRadius:10,
                      padding:'9px 20px', fontSize:13, fontWeight:700, fontFamily:FT.font, cursor:'pointer',
                    }}>Aggiungi</button>
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {filtered.map(f => (
                  <div key={f.id} onClick={() => { setSelected(f); setGrams('100'); }}
                    style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'11px 12px', borderRadius:10, cursor:'pointer',
                      background: selected?.id===f.id ? meta.bg : 'transparent',
                      transition:'background 0.1s',
                    }}>
                    <span style={{ fontSize:14, color:FT.text, fontFamily:FT.font, fontWeight:500 }}>{f.name}</span>
                    <span style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font }}>{f.kcalPer100} kcal/100g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB BARCODE */}
          {tab === 'barcode' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:10 }}>
              <div style={{
                width:'100%', aspectRatio:'1', borderRadius:16, background:'#1E2532',
                position:'relative', overflow:'hidden', maxWidth:280,
              }}>
                {/* Fake camera */}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #2a3040 0%, #1a2030 100%)' }}/>
                {/* Scan frame */}
                <div style={{ position:'absolute', inset:'20%', border:'2px solid rgba(255,255,255,0.6)', borderRadius:8 }}>
                  {[['0 0','tl'],['100% 0','tr'],['0 100%','bl'],['100% 100%','br']].map(([pos, key]) => (
                    <div key={key} style={{
                      position:'absolute', width:20, height:20,
                      borderColor: meta.color,
                      ...(key==='tl' ? {top:-1, left:-1, borderTopWidth:3, borderLeftWidth:3, borderStyle:'solid', borderBottomColor:'transparent', borderRightColor:'transparent', borderRadius:'4px 0 0 0'} :
                          key==='tr' ? {top:-1, right:-1, borderTopWidth:3, borderRightWidth:3, borderStyle:'solid', borderBottomColor:'transparent', borderLeftColor:'transparent', borderRadius:'0 4px 0 0'} :
                          key==='bl' ? {bottom:-1, left:-1, borderBottomWidth:3, borderLeftWidth:3, borderStyle:'solid', borderTopColor:'transparent', borderRightColor:'transparent', borderRadius:'0 0 0 4px'} :
                          {bottom:-1, right:-1, borderBottomWidth:3, borderRightWidth:3, borderStyle:'solid', borderTopColor:'transparent', borderLeftColor:'transparent', borderRadius:'0 0 4px 0'}),
                    }}/>
                  ))}
                  {/* scan line */}
                  <div style={{
                    position:'absolute', left:0, right:0, top:'40%', height:2,
                    background:`linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                    opacity:0.9,
                  }}/>
                </div>
                <div style={{ position:'absolute', bottom:14, left:0, right:0, textAlign:'center' }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontFamily:FT.font }}>
                    Inquadra il codice a barre
                  </span>
                </div>
              </div>
              <p style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font, textAlign:'center', marginTop:16, lineHeight:1.6 }}>
                Punta la fotocamera verso il codice a barre<br/>del prodotto per identificarlo automaticamente.
              </p>
            </div>
          )}

          {/* TAB MANUALE */}
          {tab === 'manual' && (
            <div>
              <Input label="Nome alimento" value={manual.name} onChange={v => setManual(p=>({...p,name:v}))} placeholder="es. Pasta al pomodoro"/>
              <Input label="Kcal per 100g" value={manual.kcalPer100} onChange={v => setManual(p=>({...p,kcalPer100:v}))} type="number" placeholder="es. 350"/>
              <Input label="Grammi" value={manual.grams} onChange={v => setManual(p=>({...p,grams:v}))} type="number" placeholder="es. 120" unit="g"/>
              {manualKcal > 0 && (
                <div style={{ background:meta.bg, borderRadius:12, padding:'12px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:FT.textSec, fontFamily:FT.font }}>Totale calorie</span>
                  <span style={{ fontSize:22, fontWeight:800, color:meta.color, fontFamily:FT.font }}>{manualKcal} kcal</span>
                </div>
              )}
              <button onClick={confirmManual} disabled={!manual.name || !manual.kcalPer100 || !manual.grams} style={{
                width:'100%', height:44, borderRadius:12, background:meta.color, border:'none', cursor:'pointer',
                color:'white', fontSize:14, fontWeight:700, fontFamily:FT.font,
                opacity: (!manual.name || !manual.kcalPer100 || !manual.grams) ? 0.5 : 1,
              }}>
                Aggiungi alimento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FavoritesScreen ──────────────────────────────────────────
function FavoritesScreen({ favorites, setFavorites, onAddToLog }) {
  const [showNew, setShowNew] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const createFav = () => {
    if (!newName.trim()) return;
    setFavorites(prev => [...prev, { id: Date.now(), name: newName.trim(), totalKcal: 0, foods: [] }]);
    setNewName(''); setShowNew(false);
  };

  return (
    <div style={{ background:FT.bg, minHeight:'100%' }}>
      <div style={{ background:'white', padding:'16px 20px 14px', borderBottom:`1px solid ${FT.border}` }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:FT.text, fontFamily:FT.font }}>Preferiti</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:FT.textSec, fontFamily:FT.font }}>I tuoi pasti salvati</p>
      </div>
      <div style={{ padding:'14px 14px 0' }}>
        {favorites.map(fav => (
          <Card key={fav.id} style={{ marginBottom:10, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 14px' }}>
              <div style={{
                width:44, height:44, borderRadius:12, background:FT.purple+'20',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                {Ico.heart(FT.purple)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{fav.name}</div>
                <div style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font, marginTop:2 }}>
                  {fav.totalKcal > 0 ? `${fav.totalKcal} kcal` : 'Pasto vuoto'}
                </div>
              </div>
              <button onClick={() => onAddToLog(fav)} style={{
                background:FT.green, color:'white', border:'none', borderRadius:10,
                padding:'8px 14px', fontSize:12, fontWeight:700, fontFamily:FT.font, cursor:'pointer',
              }}>
                Aggiungi
              </button>
            </div>
          </Card>
        ))}

        {showNew && (
          <Card style={{ marginBottom:10, padding:'14px' }}>
            <Input label="Nome pasto" value={newName} onChange={setNewName} placeholder="es. Pranzo della settimana"/>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={() => setShowNew(false)} style={{ flex:1, height:36, borderRadius:10, border:`1.5px solid ${FT.border}`, background:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:FT.textSec, fontFamily:FT.font }}>
                Annulla
              </button>
              <button onClick={createFav} style={{ flex:1, height:36, borderRadius:10, background:FT.green, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'white', fontFamily:FT.font }}>
                Crea
              </button>
            </div>
          </Card>
        )}

        <div style={{ height:80 }}/>
      </div>

      {/* FAB */}
      {!showNew && (
        <button onClick={() => setShowNew(true)} style={{
          position:'absolute', bottom:80, right:16, width:52, height:52,
          borderRadius:'50%', background:FT.purple, border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 16px ${FT.purple}50`,
        }}>
          {Ico.plus()}
        </button>
      )}
    </div>
  );
}

// ─── BarChart ─────────────────────────────────────────────────
function BarChart({ data, target }) {
  const maxKcal = Math.max(target * 1.35, ...data.map(d => d.kcal));
  const H = 130, W = 320;
  const n = data.length;
  const barW = n <= 7 ? 30 : 7;
  const gap = (W - n * barW) / (n + 1);
  const targetY = H - (target / maxKcal) * H;

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" style={{ overflow:'visible' }}>
      {/* Target line */}
      <line x1={0} y1={targetY} x2={W} y2={targetY}
        stroke={FT.textSec} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.55"/>
      <text x={W-2} y={targetY-4} textAnchor="end" fontSize="8" fill={FT.textSec} fontFamily={FT.font}>
        Obiettivo
      </text>

      {data.map((d, i) => {
        const x = gap + i * (barW + gap);
        const underH = (Math.min(d.kcal, target) / maxKcal) * H;
        const overH = d.kcal > target ? ((d.kcal - target) / maxKcal) * H : 0;
        const totalH = underH + overH;
        const rx = n <= 7 ? 5 : 2;

        return (
          <g key={i}>
            <rect x={x} y={H - underH} width={barW} height={underH} rx={rx}
              fill={FT.green} opacity={d.isToday ? 1 : 0.65}/>
            {overH > 0 && (
              <rect x={x} y={H - totalH} width={barW} height={overH} rx={rx}
                fill={FT.red} opacity={d.isToday ? 1 : 0.65}/>
            )}
            {n <= 7 && (
              <text x={x + barW/2} y={H + 14} textAnchor="middle"
                fontSize="9" fill={d.isToday ? FT.green : FT.textSec}
                fontFamily={FT.font} fontWeight={d.isToday ? 700 : 400}>
                {d.dayLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── HistoryScreen ────────────────────────────────────────────
function HistoryScreen({ dailyTarget }) {
  const [view, setView] = React.useState('7d');
  const data = view === '7d' ? HISTORY_DATA.slice(-7) : HISTORY_DATA;
  const under = data.filter(d => d.kcal <= dailyTarget).length;
  const over  = data.filter(d => d.kcal > dailyTarget).length;
  const avg   = Math.round(data.reduce((s,d) => s + d.kcal, 0) / data.length);

  return (
    <div style={{ background:FT.bg, minHeight:'100%' }}>
      <div style={{ background:'white', padding:'16px 20px 14px', borderBottom:`1px solid ${FT.border}` }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:FT.text, fontFamily:FT.font }}>Storico</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:FT.textSec, fontFamily:FT.font }}>Andamento calorico</p>
      </div>

      <div style={{ padding:'14px 14px 0' }}>
        {/* Toggle */}
        <div style={{ display:'flex', gap:3, background:'white', borderRadius:10, padding:3, marginBottom:14, boxShadow:FT.shadow }}>
          {['7d','30d'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex:1, padding:'7px 0', border:'none', borderRadius:8, cursor:'pointer',
              background: view===v ? FT.green : 'transparent', fontFamily:FT.font,
              fontSize:13, fontWeight:700, color: view===v ? 'white' : FT.textSec,
              transition:'all 0.2s',
            }}>
              {v === '7d' ? 'Ultimi 7 giorni' : 'Ultimi 30 giorni'}
            </button>
          ))}
        </div>

        {/* Chart */}
        <Card style={{ padding:'16px 14px 10px', marginBottom:12 }}>
          <BarChart data={data} target={dailyTarget}/>
        </Card>

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          {[
            { label:'Media kcal', value: avg.toLocaleString('it-IT'), color: FT.blue },
            { label:'Nei limiti', value: under, color: FT.green },
            { label:'Ecceduto', value: over, color: FT.red },
          ].map(s => (
            <Card key={s.label} style={{ flex:1, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:FT.font }}>{s.value}</div>
              <div style={{ fontSize:10, color:FT.textSec, fontFamily:FT.font, marginTop:2 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Lista giorni */}
        <Card style={{ overflow:'hidden', marginBottom:14 }}>
          {[...data].reverse().map((d, i) => {
            const delta = d.kcal - dailyTarget;
            const isPos = delta <= 0;
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', padding:'11px 14px',
                borderBottom: i < data.length-1 ? `1px solid ${FT.border}` : 'none',
                background: d.isToday ? FT.greenLight : 'white',
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight: d.isToday ? 700 : 500, color:FT.text, fontFamily:FT.font }}>
                    {d.isToday ? 'Oggi' : d.dateLabel}
                    {d.isToday && <span style={{ fontSize:10, color:FT.green, fontFamily:FT.font, marginLeft:6 }}>●</span>}
                  </div>
                  <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{d.dayLabel}</div>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font, marginRight:10 }}>
                  {d.kcal.toLocaleString('it-IT')} kcal
                </span>
                <span style={{
                  fontSize:11, fontWeight:700, fontFamily:FT.font,
                  color: isPos ? FT.green : FT.red,
                  background: isPos ? FT.greenLight : FT.redLight,
                  padding:'3px 7px', borderRadius:20,
                }}>
                  {isPos ? '' : '+'}{delta.toLocaleString('it-IT')}
                </span>
              </div>
            );
          })}
        </Card>
        <div style={{ height:12 }}/>
      </div>
    </div>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────
function SettingsScreen({ user, setUser, bmr, tdee, dailyTarget }) {
  const SectionTitle = ({ title }) => (
    <div style={{ fontSize:11, fontWeight:700, color:FT.textSec, fontFamily:FT.font, textTransform:'uppercase', letterSpacing:0.8, margin:'18px 0 10px', paddingLeft:2 }}>
      {title}
    </div>
  );

  const u = (key, val) => setUser(p => ({ ...p, [key]: val }));

  const activities = [
    { id:'sedentary', label:'Sedentario', desc:'Poco o nessun esercizio' },
    { id:'light', label:'Leggero', desc:'1–3 giorni/settimana' },
    { id:'moderate', label:'Moderato', desc:'3–5 giorni/settimana' },
    { id:'active', label:'Attivo', desc:'6–7 giorni/settimana' },
    { id:'very_active', label:'Molto attivo', desc:'Allenamento intensivo' },
  ];

  const goals = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ background:FT.bg, minHeight:'100%' }}>
      <div style={{ background:'white', padding:'16px 20px 14px', borderBottom:`1px solid ${FT.border}` }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:FT.text, fontFamily:FT.font }}>Impostazioni</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:FT.textSec, fontFamily:FT.font }}>Profilo e obiettivi</p>
      </div>

      <div style={{ padding:'0 14px' }}>
        <SectionTitle title="Dati personali"/>
        <Card style={{ padding:'14px', marginBottom:4 }}>
          <div style={{ display:'flex', gap:8, marginBottom:4 }}>
            <div style={{ width:90 }}><Input label="Peso" value={user.weight} onChange={v=>u('weight',parseFloat(v)||0)} type="number" unit="kg"/></div>
            <div style={{ width:90 }}><Input label="Altezza" value={user.height} onChange={v=>u('height',parseFloat(v)||0)} type="number" unit="cm"/></div>
            <div style={{ width:74 }}><Input label="Età" value={user.age} onChange={v=>u('age',parseInt(v)||0)} type="number" unit="aa"/></div>
          </div>
          <div style={{ marginBottom:4 }}>
            <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font, fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>Sesso</div>
            <div style={{ display:'flex', gap:6 }}>
              {['M','F'].map(g => (
                <button key={g} onClick={() => u('gender',g)} style={{
                  flex:1, height:40, borderRadius:10, border:`1.5px solid ${user.gender===g ? FT.green : FT.border}`,
                  background: user.gender===g ? FT.greenLight : 'white', cursor:'pointer',
                  fontSize:13, fontWeight:700, color: user.gender===g ? FT.green : FT.textSec,
                  fontFamily:FT.font,
                }}>
                  {g === 'M' ? 'Uomo' : 'Donna'}
                </button>
              ))}
            </div>
          
          </div>
        </Card>

        <SectionTitle title="Livello di attività"/>
        <Card style={{ overflow:'hidden', marginBottom:4 }}>
          {activities.map((a, i) => (
            <div key={a.id} onClick={() => u('activity', a.id)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer',
              borderBottom: i < activities.length-1 ? `1px solid ${FT.border}` : 'none',
              background: user.activity===a.id ? FT.greenLight : 'white',
            }}>
              <div style={{
                width:10, height:10, borderRadius:'50%', flexShrink:0,
                background: user.activity===a.id ? FT.green : FT.border,
                boxShadow: user.activity===a.id ? `0 0 0 3px ${FT.greenLight}` : 'none',
                border: user.activity===a.id ? `2px solid white` : '2px solid transparent',
              }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{a.label}</div>
                <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{a.desc}</div>
              </div>
              {user.activity===a.id && (
                <span style={{ fontSize:12, fontWeight:700, color:FT.green, fontFamily:FT.font }}>✓</span>
              )}
            </div>
          ))}
        </Card>

        <SectionTitle title="Obiettivo settimanale"/>
        <Card style={{ padding:'14px', marginBottom:4 }}>
          <div style={{ display:'flex', gap:6 }}>
            {goals.map(g => (
              <button key={g} onClick={() => u('weeklyGoal',g)} style={{
                flex:1, height:44, borderRadius:10, border:`1.5px solid ${user.weeklyGoal===g ? FT.green : FT.border}`,
                background: user.weeklyGoal===g ? FT.greenLight : 'white', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
              }}>
                <span style={{ fontSize:13, fontWeight:800, color: user.weeklyGoal===g ? FT.green : FT.text, fontFamily:FT.font }}>{g}</span>
                <span style={{ fontSize:9, color:FT.textSec, fontFamily:FT.font }}>kg/sett</span>
              </button>
            ))}
          </div>
        </Card>

        <SectionTitle title="Valori calcolati"/>
        <Card style={{ overflow:'hidden', marginBottom:4 }}>
          {[
            { label:'BMR (metabolismo basale)', value:`${bmr.toLocaleString('it-IT')} kcal/giorno` },
            { label:'TDEE (fabbisogno totale)', value:`${tdee.toLocaleString('it-IT')} kcal/giorno` },
            { label:'Obiettivo calorico giornaliero', value:`${dailyTarget.toLocaleString('it-IT')} kcal/giorno`, highlight:true },
          ].map((item, i) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'12px 14px', borderBottom: i < 2 ? `1px solid ${FT.border}` : 'none',
              background: item.highlight ? FT.greenLight : 'white',
            }}>
              <span style={{ fontSize:12, color:FT.textSec, fontFamily:FT.font, flex:1, paddingRight:8 }}>{item.label}</span>
              <span style={{ fontSize:14, fontWeight:800, color: item.highlight ? FT.green : FT.text, fontFamily:FT.font, flexShrink:0 }}>{item.value}</span>
            </div>
          ))}
        </Card>

        <SectionTitle title="Contorno verdure"/>
        <Card style={{ padding:'14px', marginBottom:4 }}>
          <Input label="Calorie contorno fisso" value={user.sideDishKcal} onChange={v=>u('sideDishKcal',parseInt(v)||0)} type="number" unit="kcal"/>
          <p style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font, margin:0 }}>Costo calorico fisso per le verdure di contorno</p>
        </Card>

        <div style={{ height:20 }}/>
      </div>
    </div>
  );
}

// ─── OnboardingScreen ─────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({ weight:70, height:170, age:28, gender:'M', activity:'moderate', weeklyGoal:0.5 });
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));

  const { bmr, tdee, dailyTarget } = calcTarget(data);

  const activities = [
    { id:'sedentary', label:'Sedentario', icon:'🪑', desc:'Ufficio, poco moto' },
    { id:'light', label:'Leggero', icon:'🚶', desc:'1–3 allenamenti/sett' },
    { id:'moderate', label:'Moderato', icon:'🚴', desc:'3–5 allenamenti/sett' },
    { id:'active', label:'Attivo', icon:'🏋️', desc:'6–7 allenamenti/sett' },
    { id:'very_active', label:'Intensivo', icon:'⚡', desc:'Doppi allenamenti' },
  ];

  const goals = [
    { val:0.25, label:'–0.25 kg', desc:'Lento e costante' },
    { val:0.5,  label:'–0.5 kg',  desc:'Consigliato' },
    { val:0.75, label:'–0.75 kg', desc:'Impegnativo' },
    { val:1.0,  label:'–1.0 kg',  desc:'Aggressivo' },
  ];

  const stepColors = [FT.orange, FT.blue, FT.purple, FT.green];
  const color = stepColors[step];

  const steps = ['Profilo', 'Attività', 'Obiettivo', 'Risultato'];

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'white' }}>
      {/* Header colorato */}
      <div style={{ background:color, padding:'24px 20px 20px', transition:'background 0.4s' }}>
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {steps.map((s,i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i<=step ? 'white' : 'rgba(255,255,255,0.3)', transition:'background 0.3s' }}/>
          ))}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontFamily:FT.font, fontWeight:600, marginBottom:4 }}>
          Passo {step+1} di {steps.length}
        </div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'white', fontFamily:FT.font }}>
          {step===0 ? 'Ciao! Parlami di te' : step===1 ? 'Quanto sei attivo?' : step===2 ? 'Qual è il tuo obiettivo?' : 'Tutto pronto!'}
        </h2>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 0' }}>

        {step === 0 && (
          <div>
            <div style={{ display:'flex', gap:10, marginBottom:2 }}>
              <div style={{ flex:1 }}><Input label="Peso attuale" value={data.weight} onChange={v=>u('weight',parseFloat(v)||0)} type="number" unit="kg"/></div>
              <div style={{ flex:1 }}><Input label="Altezza" value={data.height} onChange={v=>u('height',parseFloat(v)||0)} type="number" unit="cm"/></div>
            </div>
            <Input label="Età" value={data.age} onChange={v=>u('age',parseInt(v)||0)} type="number" unit="anni"/>
            <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Sesso biologico</div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              {['M','F'].map(g => (
                <button key={g} onClick={() => u('gender',g)} style={{
                  flex:1, height:50, borderRadius:12, border:`2px solid ${data.gender===g ? color : FT.border}`,
                  background: data.gender===g ? color+'15' : 'white', cursor:'pointer',
                  fontSize:14, fontWeight:700, color: data.gender===g ? color : FT.textSec, fontFamily:FT.font,
                }}>
                  {g === 'M' ? '♂ Uomo' : '♀ Donna'}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {activities.map(a => (
              <div key={a.id} onClick={() => u('activity', a.id)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, cursor:'pointer',
                border:`2px solid ${data.activity===a.id ? color : FT.border}`,
                background: data.activity===a.id ? color+'12' : 'white', transition:'all 0.15s',
              }}>
                <span style={{ fontSize:22 }}>{a.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{a.label}</div>
                  <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{a.desc}</div>
                </div>
                {data.activity===a.id && (
                  <div style={{ width:20, height:20, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:10, color:'white', fontWeight:700 }}>✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {goals.map(g => (
              <div key={g.val} onClick={() => u('weeklyGoal', g.val)} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, cursor:'pointer',
                border:`2px solid ${data.weeklyGoal===g.val ? color : FT.border}`,
                background: data.weeklyGoal===g.val ? color+'12' : 'white', transition:'all 0.15s',
              }}>
                <div style={{ width:36, height:36, borderRadius:10, background: data.weeklyGoal===g.val ? color : FT.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:13, fontWeight:800, color: data.weeklyGoal===g.val ? 'white' : FT.textSec, fontFamily:FT.font }}>{g.val}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:FT.text, fontFamily:FT.font }}>{g.label} / settimana</div>
                  <div style={{ fontSize:11, color:FT.textSec, fontFamily:FT.font }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ textAlign:'center', padding:'10px 0 20px' }}>
              <div style={{ width:100, height:100, borderRadius:'50%', background:FT.greenLight, margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', border:`3px solid ${FT.green}` }}>
                <span style={{ fontSize:36, fontWeight:900, color:FT.green, fontFamily:FT.font }}>✓</span>
              </div>
              <div style={{ fontSize:14, color:FT.textSec, fontFamily:FT.font, marginBottom:4 }}>Il tuo obiettivo calorico giornaliero è</div>
              <div style={{ fontSize:44, fontWeight:900, color:FT.text, fontFamily:FT.font, lineHeight:1 }}>{dailyTarget.toLocaleString('it-IT')}</div>
              <div style={{ fontSize:16, color:FT.textSec, fontFamily:FT.font, marginBottom:20 }}>kcal / giorno</div>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                {[
                  { label:'BMR', val:`${bmr} kcal`, color:FT.orange },
                  { label:'TDEE', val:`${tdee} kcal`, color:FT.blue },
                  { label:'Deficit', val:`${tdee-dailyTarget} kcal`, color:FT.purple },
                ].map(s => (
                  <div key={s.label} style={{ background:s.color+'15', borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:FT.font }}>{s.val}</div>
                    <div style={{ fontSize:10, color:FT.textSec, fontFamily:FT.font }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ height:16 }}/>
      </div>

      {/* Footer buttons */}
      <div style={{ padding:'12px 20px 20px', display:'flex', gap:10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s=>s-1)} style={{
            width:44, height:44, borderRadius:12, border:`1.5px solid ${FT.border}`, background:'white',
            cursor:'pointer', fontSize:18, color:FT.textSec,
          }}>←</button>
        )}
        <button onClick={() => { if (step < 3) setStep(s=>s+1); else onComplete(data); }}
          style={{
            flex:1, height:44, borderRadius:12, background:color, border:'none', cursor:'pointer',
            fontSize:15, fontWeight:700, color:'white', fontFamily:FT.font,
            boxShadow:`0 4px 16px ${color}50`, transition:'background 0.4s, box-shadow 0.4s',
          }}>
          {step === 3 ? 'Iniziamo! 🚀' : 'Avanti'}
        </button>
      </div>
    </div>
  );
}

// ─── BarcodeScreen ────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { barcode:'8001120983527', name:'Barilla Spaghetti n.5',      kcalPer100:352, p:13, c:70, f:2,  brand:'Barilla' },
  { barcode:'8076809513388', name:'Mulino Bianco Abbracci',      kcalPer100:467, p:7,  c:63, f:20, brand:'Mulino Bianco' },
  { barcode:'8000500310427', name:'Nutella',                     kcalPer100:539, p:6,  c:58, f:31, brand:'Ferrero' },
  { barcode:'8001060900059', name:'Petto di Pollo AIA',          kcalPer100:99,  p:21, c:1,  f:1,  brand:'AIA' },
  { barcode:'8001000100000', name:'Oikos Yogurt Greco',          kcalPer100:62,  p:9,  c:5,  f:1,  brand:'Danone' },
  { barcode:'8000500215050', name:'Kinder Bueno',                kcalPer100:568, p:9,  c:52, f:36, brand:'Ferrero' },
];

function BarcodeScreen({ onAddFood }) {
  const [scanning, setScanning] = React.useState(false);
  const [result, setResult]     = React.useState(null);
  const [grams, setGrams]       = React.useState('100');
  const [meal, setMeal]         = React.useState('lunch');
  const [added, setAdded]       = React.useState(false);
  const [scanLine, setScanLine] = React.useState(0);

  // Animazione linea di scansione
  React.useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => setScanLine(p => (p + 3) % 100), 16);
    return () => clearInterval(interval);
  }, [scanning]);

  const startScan = () => {
    setResult(null); setAdded(false); setScanning(true);
    setTimeout(() => {
      const prod = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
      setResult(prod); setScanning(false);
    }, 2200);
  };

  const handleAdd = () => {
    if (!result) return;
    onAddFood(meal, { name: result.name, kcalPer100: result.kcalPer100, grams: parseInt(grams) || 100 });
    setAdded(true);
    setTimeout(() => { setResult(null); setAdded(false); setGrams('100'); }, 1800);
  };

  const kcal = result ? calcKcal(parseInt(grams) || 0, result.kcalPer100) : 0;

  return (
    <div style={{ background: FT.bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', padding: '16px 20px 14px', borderBottom: `1px solid ${FT.border}` }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: FT.text, fontFamily: FT.font }}>Scansiona</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: FT.textSec, fontFamily: FT.font }}>Leggi il barcode di un prodotto</p>
      </div>

      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        {/* Viewfinder */}
        <div style={{
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          background: '#111820', aspectRatio: '4/3', marginBottom: 16,
        }}>
          {/* sfondo camera fake */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1a2535 0%, #0d1520 100%)' }}/>

          {/* griglia leggera */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }} viewBox="0 0 100 75">
            {[20,40,60,80].map(x => <line key={x} x1={x} y1={0} x2={x} y2={75} stroke="white" strokeWidth="0.3"/>)}
            {[15,30,45,60].map(y => <line key={y} x1={0} y1={y} x2={100} y2={y} stroke="white" strokeWidth="0.3"/>)}
          </svg>

          {/* Cornice scansione */}
          <div style={{ position: 'absolute', inset: '15%', borderRadius: 8 }}>
            {[{top:-1,left:-1,bt:'3px solid transparent',bb:'transparent',bl:'3px solid',br:'transparent',btr:'0',btl:'6px',bbl:'0',bbr:'0'},
              {top:-1,right:-1,bt:'3px solid transparent',bb:'transparent',bl:'transparent',br:'3px solid',btr:'6px',btl:'0',bbl:'0',bbr:'0'},
              {bottom:-1,left:-1,bt:'transparent',bb:'3px solid transparent',bl:'3px solid',br:'transparent',btr:'0',btl:'0',bbl:'6px',bbr:'0'},
              {bottom:-1,right:-1,bt:'transparent',bb:'3px solid transparent',bl:'transparent',br:'3px solid',btr:'0',btl:'0',bbl:'0',bbr:'6px'},
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: 22, height: 22,
                top: c.top, bottom: c.bottom, left: c.left, right: c.right,
                borderTop: c.bt?.replace('3px solid transparent','') || (c.bt?.includes('transparent') ? 'none' : `3px solid ${FT.green}`),
                borderBottom: c.bb?.includes('transparent') ? 'none' : `3px solid ${FT.green}`,
                borderLeft: c.bl?.includes('transparent') ? 'none' : `3px solid ${FT.green}`,
                borderRight: c.br?.includes('transparent') ? 'none' : `3px solid ${FT.green}`,
                borderTopLeftRadius: c.btl, borderTopRightRadius: c.btr,
                borderBottomLeftRadius: c.bbl, borderBottomRightRadius: c.bbr,
              }}/>
            ))}

            {/* Linea di scansione animata */}
            {scanning && (
              <div style={{
                position: 'absolute', left: 0, right: 0,
                top: `${scanLine}%`, height: 2,
                background: `linear-gradient(90deg, transparent, ${FT.green}, transparent)`,
                boxShadow: `0 0 8px ${FT.green}`,
              }}/>
            )}

            {/* Barcode mock quando in scansione */}
            {scanning && (
              <div style={{ position: 'absolute', inset: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: 0.3 }}>
                {Array.from({length: 18}).map((_, i) => (
                  <div key={i} style={{ width: i%3===0?3:1, height: '60%', background: 'white', borderRadius: 1 }}/>
                ))}
              </div>
            )}
          </div>

          {/* Testo status */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: FT.font }}>
              {scanning ? 'Scansione in corso...' : result ? '✓ Prodotto identificato' : 'Premi "Scansiona" per iniziare'}
            </span>
          </div>
        </div>

        {/* Bottone scansiona */}
        {!result && (
          <button onClick={startScan} disabled={scanning} style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: scanning ? 'default' : 'pointer',
            background: scanning ? FT.border : FT.text, color: scanning ? FT.textSec : 'white',
            fontSize: 15, fontWeight: 700, fontFamily: FT.font,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.2s',
          }}>
            {Ico.barcode(scanning ? FT.textSec : 'white')}
            {scanning ? 'Scansione...' : 'Scansiona barcode'}
          </button>
        )}

        {/* Card risultato */}
        {result && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <Card style={{ padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ fontSize: 11, color: FT.textSec, fontFamily: FT.font, marginBottom: 2 }}>{result.brand}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: FT.text, fontFamily: FT.font, lineHeight: 1.2 }}>{result.name}</div>
                  <div style={{ fontSize: 12, color: FT.textSec, fontFamily: FT.font, marginTop: 3 }}>
                    {result.kcalPer100} kcal / 100g
                  </div>
                </div>
                <div style={{ background: FT.greenLight, borderRadius: 12, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: FT.green, fontFamily: FT.font, lineHeight: 1 }}>{kcal}</div>
                  <div style={{ fontSize: 9, color: FT.textSec, fontFamily: FT.font }}>kcal</div>
                </div>
              </div>

              {/* Macros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Proteine', val: result.p, color: FT.blue },
                  { label: 'Carboidrati', val: result.c, color: FT.orange },
                  { label: 'Grassi', val: result.f, color: FT.purple },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, background: m.color + '15', borderRadius: 10, padding: '8px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.color, fontFamily: FT.font }}>{m.val}g</div>
                    <div style={{ fontSize: 9, color: FT.textSec, fontFamily: FT.font }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Grammi + Pasto */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: FT.bg, borderRadius: 10, border: `1.5px solid ${FT.border}`, flex: 1, overflow: 'hidden' }}>
                  <input type="number" value={grams} onChange={e => setGrams(e.target.value)}
                    style={{ flex: 1, border: 'none', background: 'none', padding: '9px 12px', fontSize: 15, fontWeight: 700, color: FT.text, fontFamily: FT.font, outline: 'none', width: 50 }}/>
                  <span style={{ paddingRight: 12, fontSize: 12, color: FT.textSec, fontFamily: FT.font }}>g</span>
                </div>
                <select value={meal} onChange={e => setMeal(e.target.value)} style={{
                  flex: 1.4, border: `1.5px solid ${FT.border}`, borderRadius: 10, background: FT.bg,
                  padding: '9px 12px', fontSize: 13, fontWeight: 600, color: FT.text,
                  fontFamily: FT.font, outline: 'none', cursor: 'pointer',
                }}>
                  <option value="breakfast">Colazione</option>
                  <option value="lunch">Pranzo</option>
                  <option value="dinner">Cena</option>
                  <option value="snack">Spuntino</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setResult(null); setAdded(false); }} style={{
                  height: 44, borderRadius: 12, border: `1.5px solid ${FT.border}`, background: 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, color: FT.textSec, fontFamily: FT.font, padding: '0 16px',
                }}>
                  Riscan.
                </button>
                <button onClick={handleAdd} style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: added ? FT.greenLight : FT.green, color: added ? FT.green : 'white',
                  fontSize: 14, fontWeight: 700, fontFamily: FT.font, transition: 'all 0.2s',
                }}>
                  {added ? '✓ Aggiunto!' : `Aggiungi a ${FT.meal[meal].label}`}
                </button>
              </div>
            </Card>

            <p style={{ fontSize: 11, color: FT.textSec, fontFamily: FT.font, textAlign: 'center', lineHeight: 1.5 }}>
              Barcode: {result.barcode}
            </p>
          </div>
        )}
        <div style={{ height: 20 }}/>
      </div>
    </div>
  );
}

Object.assign(window, { FOOD_DB, HISTORY_DATA, MealSection, HomeScreen, AddFoodModal, FavoritesScreen, HistoryScreen, SettingsScreen, OnboardingScreen, BarcodeScreen });
