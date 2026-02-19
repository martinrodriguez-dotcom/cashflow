import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Users, Settings, Package, BarChart3, DollarSign, 
  PieChart, Activity, Plus, Trash2, ChevronLeft, Menu, 
  Calculator, Briefcase, Save, Zap, Target, ArrowUpRight,
  ShieldCheck, Percent, Layers, Gauge, Thermometer, Landmark, 
  FileText, ReceiptText, Wallet, Info, Clock, ShoppingCart, 
  Lightbulb, Megaphone, Boxes, Scale, HelpCircle, ArrowRightLeft,
  CalendarDays, CheckCircle2, AlertTriangle, TrendingDown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart as RePie, Cell, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart as BChart, Bar, ComposedChart
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBpIUJfaVxDBZZo14ph26fZ--2L5Tfm1NI",
  authDomain: "cash-flow-4aac7.firebaseapp.com",
  projectId: "cash-flow-4aac7",
  storageBucket: "cash-flow-4aac7.firebasestorage.app",
  messagingSenderId: "561130385612",
  appId: "1:561130385612:web:20028060976a759eab9269"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'fin-strategist-v10';

// --- UTILIDADES ---
const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) || !isFinite(n) ? 0 : n;
};

const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'USD', 
  maximumFractionDigits: 0 
}).format(val);

// --- COMPONENTE INFO ICON ---
const InfoIcon = ({ text }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <HelpCircle size={14} className="text-indigo-400/60 hover:text-indigo-400 cursor-help transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// --- MOTOR FINANCIERO CORE ---
const runGlobalProjection = (params, forcedScenario = null) => {
  const {
    investment, discountRate, inflationRate, taxRate, 
    staff, fixedCosts, assets, products, initialUnitsTotal, 
    salesGrowth, scenario, loanAmount, loanRate, loanTerm,
    seasonality, ivaRate, iibbRate, gatewayFee, safetyStockMonths, cacCost, collectionDays
  } = params;

  const activeScenario = forcedScenario || scenario;
  const sMult = activeScenario === 'optimistic' ? 1.25 : activeScenario === 'pessimistic' ? 0.75 : 1;
  
  const months = [];
  const monthlyDepr = (assets || []).reduce((a, b) => a + (safeNum(b.value) / (safeNum(b.life || 1) * 12)), 0);
  const totalFixedCostsInit = (fixedCosts || []).reduce((a, b) => a + safeNum(b.amount), 0);
  
  const avgCost = (products || []).length > 0 ? products.reduce((acc, p) => acc + safeNum(p.cost), 0) / products.length : 0;
  const avgMargin = (products || []).length > 0 ? products.reduce((acc, p) => acc + safeNum(p.margin), 0) / products.length : 0;
  const avgPrice = avgCost * (1 + avgMargin/100);

  let units = safeNum(initialUnitsTotal);
  let equity = safeNum(investment) - safeNum(loanAmount);
  let cumulativeCash = -equity;
  let loanBalance = safeNum(loanAmount);
  let accumulatedDepr = 0;
  let retainedEarnings = 0;
  let revenueHistory = Array(14).fill(0);
  let paybackMonth = null;

  for (let m = 1; m <= 12; m++) {
    const infMult = Math.pow(1 + (safeNum(inflationRate)/100), m);
    const monthSeasonality = seasonality[m-1] || 1;
    const mUnits = units * monthSeasonality * sMult;
    
    const price = avgPrice * infMult;
    const unitCost = avgCost * infMult;
    const grossRev = mUnits * price;
    const totalCOGS = mUnits * unitCost;

    const iibb = grossRev * (safeNum(iibbRate)/100);
    const gateway = grossRev * (safeNum(gatewayFee)/100);
    const mkt = (mUnits * (safeNum(salesGrowth)/100)) * safeNum(cacCost) * infMult;
    const mFixed = totalFixedCostsInit * infMult;

    const cStaff = (staff || []).reduce((acc, s) => {
      const base = (safeNum(s.basic) + safeNum(s.additional)) * infMult;
      const taxP = safeNum(s.employerTaxesRate) / 100;
      const sac = (m === 6 || m === 12) ? (base * 0.5) : 0;
      return acc + (base + sac) * (1 + taxP);
    }, 0);

    const ebitda = grossRev - totalCOGS - cStaff - mFixed - iibb - gateway - mkt;
    
    const mRate = (safeNum(loanRate)/100/12);
    const interest = loanBalance > 0 ? loanBalance * mRate : 0;
    const capitalRepay = (m <= safeNum(loanTerm)) ? (safeNum(loanAmount)/safeNum(loanTerm)) : 0;
    loanBalance = Math.max(0, loanBalance - capitalRepay);

    const ebt = ebitda - monthlyDepr - interest;
    const taxProfit = ebt > 0 ? ebt * (safeNum(taxRate)/100) : 0;
    const netIncome = ebt - taxProfit;

    revenueHistory[m] = grossRev;
    const actualCash = safeNum(collectionDays) >= 30 ? (revenueHistory[m-1] || 0) : grossRev;
    
    const nextUnits = units * (1 + (safeNum(salesGrowth)/100)) * (seasonality[m] || 1) * sMult;
    const targetInv = nextUnits * unitCost * safeNum(safetyStockMonths);
    const currInv = mUnits * unitCost * safeNum(safetyStockMonths);
    const invInv = targetInv - currInv;

    const cf = netIncome + monthlyDepr - capitalRepay - invInv - (grossRev - actualCash);
    cumulativeCash += cf;
    accumulatedDepr += monthlyDepr;
    retainedEarnings += netIncome;

    if (cumulativeCash >= 0 && paybackMonth === null) paybackMonth = m;

    months.push({
      m: `M${m}`,
      revenue: grossRev,
      ebitda,
      netIncome,
      interest,
      capitalRepay,
      cf,
      cumCash: cumulativeCash,
      equity: equity + retainedEarnings,
      debt: loanBalance,
      assets: { cash: cumulativeCash, inventory: targetInv, fixed: safeNum(investment) - accumulatedDepr },
      units: mUnits
    });

    units *= (1 + (safeNum(salesGrowth) / 100));
  }

  const r = (safeNum(discountRate) / 100 / 12);
  const g = (safeNum(salesGrowth) / 100);
  const flows = months.map(m => m.cf);
  const terminal = r > g ? (flows[11] * (1 + g)) / (r - g) : flows[11] * 12;
  
  const tirAnual = investment > 0 ? (retainedEarnings / investment) * 100 : 0;

  return {
    months,
    van: months[11].cumCash + terminal * 0.5,
    totalEbitda: months.reduce((a,b)=>a+b.ebitda, 0),
    totalRev: months.reduce((a,b)=>a+b.revenue, 0),
    avgPrice,
    avgCost,
    payback: paybackMonth,
    tir: tirAnual,
    monthlyFixedCosts: totalFixedCostsInit + ((staff || []).reduce((acc, s) => acc + (safeNum(s.basic)+safeNum(s.additional)) * (1+safeNum(s.employerTaxesRate)/100), 0))
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scenario, setScenario] = useState('base');
  const [user, setUser] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const goodwillMultiple = 3;

  // --- ESTADOS ---
  const [investment, setInvestment] = useState(25000);
  const [discountRate, setDiscountRate] = useState(15);
  const [inflationRate, setInflationRate] = useState(0);
  const [taxRate, setTaxRate] = useState(30);
  const [ivaRate, setIvaRate] = useState(21);
  const [iibbRate, setIibbRate] = useState(3.5);
  const [gatewayFee, setGatewayFee] = useState(5);
  const [safetyStockMonths, setSafetyStockMonths] = useState(1);
  const [cacCost, setCacCost] = useState(0);
  const [collectionDays, setCollectionDays] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanRate, setLoanRate] = useState(45);
  const [loanTerm, setLoanTerm] = useState(12);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [initialUnitsTotal, setInitialUnitsTotal] = useState(100);
  const [salesGrowth, setSalesGrowth] = useState(5);
  const [seasonality, setSeasonality] = useState(Array(12).fill(1));

  // --- FIREBASE ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error("Firebase Auth Error:", err); }
    };
    initAuth();
    onAuthStateChanged(auth, u => { if(u) setUser(u); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'model', 'v10'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.investment !== undefined) setInvestment(d.investment);
          if (d.discountRate !== undefined) setDiscountRate(d.discountRate);
          setProducts(d.products || []);
          setStaff(d.staff || []);
          setFixedCosts(d.fixedCosts || []);
          setAssets(d.assets || []);
          // ... resto de campos
        }
      } catch (e) { console.error("Load error:", e); }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('Guardando...');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'model', 'v10'), {
        investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee,
        safetyStockMonths, collectionDays, cacCost, loanAmount, loanRate, loanTerm, products, 
        staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality
      });
      setSaveStatus('¡Hecho!');
    } catch (e) { setSaveStatus('Error'); }
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const params = useMemo(() => ({ 
    investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee, 
    safetyStockMonths, cacCost, loanAmount, loanRate, loanTerm, products, staff, 
    fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario, collectionDays 
  }), [investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee, safetyStockMonths, cacCost, loanAmount, loanRate, loanTerm, products, staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario, collectionDays]);
  
  const res = useMemo(() => runGlobalProjection(params), [params]);

  const marginPerUnit = res.avgPrice - res.avgCost;
  const monthlyBreakEvenUnits = marginPerUnit > 0 ? res.monthlyFixedCosts / marginPerUnit : 0;
  const dailyGoalUnits = Math.ceil(monthlyBreakEvenUnits / 22);
  const dailyGoalRev = dailyGoalUnits * res.avgPrice;
  const dscr = (res.totalEbitda / 12) / ((loanAmount > 0) ? (res.months[0].interest + res.months[0].capitalRepay) : 1);

  const NavItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
      <Icon size={18} />
      {isSidebarOpen && <span className="text-sm font-bold">{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <aside className={`transition-all duration-300 bg-slate-900 border-r border-slate-800 p-4 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          {isSidebarOpen && <div className="flex items-center gap-2 font-black text-xl text-indigo-400 tracking-tighter"><Scale size={22}/> MASTER STRAT</div>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 mx-auto">
            {isSidebarOpen ? <ChevronLeft size={20}/> : <Menu size={20}/>}
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem id="config" icon={Settings} label="Modelo Base" />
          <NavItem id="strategy" icon={Zap} label="Impuestos y Caja" />
          <NavItem id="products" icon={ShoppingCart} label="Catálogo" />
          <NavItem id="staff" icon={Users} label="Nómina / SAC" />
          <NavItem id="goals" icon={Target} label="Panel Operativo" />
          <NavItem id="flow" icon={Activity} label="Cash Flow" />
          <NavItem id="analysis" icon={Gauge} label="Rentabilidad" />
        </nav>
        <div className="pt-6 border-t border-slate-800">
          <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-indigo-600 py-3 rounded-2xl text-xs font-black shadow-lg">
            <Save size={16} className={saveStatus.includes('...') ? 'animate-spin' : ''}/>
            {isSidebarOpen && (saveStatus || 'SINCRONIZAR')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative bg-slate-950">
        {activeTab === 'config' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <header><h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Variables de Inversión</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                <h3 className="text-indigo-400 font-black text-[10px] uppercase flex items-center gap-2"><DollarSign size={14}/> Capital Total</h3>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Inversión ($)</label>
                  <input type="number" value={investment} onChange={e => setInvestment(safeNum(e.target.value))} className="w-full bg-transparent border-none text-2xl font-mono outline-none p-0" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200">
              💡 Si ves la pantalla negra, asegúrate de haber ejecutado <b>npm run dev</b> en la terminal de tu proyecto.
            </div>
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="max-w-6xl mx-auto space-y-10">
             <header><h2 className="text-3xl font-black italic">Dashboard Financiero</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800">
                   <h4 className="text-xs font-black text-slate-500 uppercase mb-8">Score Financiero</h4>
                   <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { s: 'Márgenes', v: Math.min(100, (res.totalEbitda/res.totalRev)*200) || 0 },
                        { s: 'Retorno', v: Math.min(100, res.tir) || 0 },
                        { s: 'Deuda', v: Math.min(100, dscr * 50) || 0 },
                        { s: 'VAN', v: res.van > 0 ? 100 : 30 }
                      ]}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="s" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar name="Biz" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 flex flex-col justify-center">
                   <p className="text-[10px] font-black text-indigo-400 uppercase">VAN (Net Present Value)</p>
                   <h3 className="text-5xl font-black">{formatCurrency(res.van)}</h3>
                   <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">TIR Est.</p><h4 className="text-2xl font-black text-emerald-400">{res.tir.toFixed(1)}%</h4></div>
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">Payback</p><h4 className="text-2xl font-black text-white">{res.payback || 'N/A'} meses</h4></div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
