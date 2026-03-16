'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import Graph from '@/components/Graph';
import { useMemo } from 'react';


interface ExperimentResult {
  id: string;
  experiment_id: string;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown>;
  created_at: string;
  experiments: {
    title: string;
    slug: string;
    icon: string;
    category: string;
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser({
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name,
      });

      const { data } = await supabase
        .from('experiment_results')
        .select('*, experiments(title, slug, icon, category)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      setResults(data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    await supabase.from('experiment_results').delete().eq('id', id);
    setResults(results.filter((r) => r.id !== id));
  };

  const uniqueExperiments = new Set(results.map((r) => r.experiment_id)).size;
  const thisWeekResults = results.filter(
    (r) => new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatOutput = (output: Record<string, unknown>) => {
    return Object.entries(output)
      .map(([key, val]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const value = typeof val === 'number' ? (Number.isInteger(val) ? val : Number(val).toFixed(2)) : val;
        return `${label}: ${value}`;
      })
      .join(' | ');
  };

  const getGraphData = (params: Record<string, unknown>, mode: 'charge' | 'discharge') => {
    const resistance = (params.resistance as number) || 1000;
    const capacitance = (params.capacitance as number) || 100;
    const voltage = (params.voltage as number) || 9;
    
    const capF = capacitance * 1e-6;
    const tau = resistance * capF;
    const tMax = tau * 5;
    const step = tMax / 50;
    
    const vPts = [];
    const iPts = [];
    
    for (let t = 0; t <= tMax; t += step) {
      const v = mode === 'charge' ? voltage * (1 - Math.exp(-t / tau)) : voltage * Math.exp(-t / tau);
      const i = (voltage / resistance) * Math.exp(-t / tau);
      vPts.push({ x: parseFloat((t * 1000).toFixed(1)), y: v });
      iPts.push({ x: parseFloat((t * 1000).toFixed(1)), y: i * 1000 });
    }
    
    return { vPts, iPts, tau: tau * 1000 };
  };


  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '72px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-accent-purple)', borderRadius: '50%',
              margin: '0 auto 20px', animation: 'spin-slow 1s linear infinite',
            }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading your dashboard...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          {/* Welcome Header */}
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: '8px',
            }}>
              Welcome back, <span className="gradient-text">{user?.full_name || 'Scientist'}</span> 👋
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px' }}>
              Here&apos;s an overview of your experiment results
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }} className="stagger-children">
            {[
              { label: 'Total Results', value: results.length, icon: '📊', color: '#8b5cf6' },
              { label: 'Experiments Tried', value: uniqueExperiments, icon: '🧪', color: '#06b6d4' },
              { label: 'This Week', value: thisWeekResults, icon: '📅', color: '#10b981' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                  <span style={{
                    padding: '4px 10px', borderRadius: '100px', fontSize: '11px',
                    background: `${stat.color}15`, color: stat.color, fontWeight: 600,
                  }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{
                  fontSize: '36px', fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                  color: stat.color,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '40px',
            flexWrap: 'wrap',
          }}>
            <Link href="/experiments" className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
              🧪 Run New Experiment
            </Link>
          </div>

          {/* Results Table */}
          <div className="animate-slide-up">
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '22px',
              fontWeight: 600,
              marginBottom: '20px',
            }}>
              Saved Results
            </h2>

            {results.length === 0 ? (
              <div className="glass-card" style={{
                padding: '60px 24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔬</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
                  No experiments yet
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
                  Run your first experiment and save the results to see them here!
                </p>
                <Link href="/experiments" className="btn-primary">
                  Browse Experiments →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((result) => {
                  const isExpanded = expandedId === result.id;
                  const mode = (result.input_params.mode as 'charge' | 'discharge') || 'charge';
                  const { vPts, iPts, tau } = getGraphData(result.input_params, mode);

                  return (
                    <div key={result.id} className="glass-card" style={{
                      padding: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                      <div 
                        onClick={() => setExpandedId(isExpanded ? null : result.id)}
                        style={{
                          padding: '20px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}
                      >
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: isExpanded ? 'var(--gradient-primary)' : 'rgba(139, 92, 246, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '22px', flexShrink: 0,
                          transition: 'all 0.3s ease',
                          color: isExpanded ? 'white' : 'inherit',
                        }}>
                          {result.experiments?.icon || '🧪'}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)',
                              fontFamily: "'Outfit', sans-serif",
                            }}>
                              {result.experiments?.title || 'Experiment'}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '100px', fontSize: '11px',
                              background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-accent-cyan)',
                            }}>
                              {result.experiments?.category}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {formatDate(result.created_at)}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {isExpanded ? 'Hide Details ↑' : 'View Details ↓'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(result.id); }}
                            className="btn-danger"
                            style={{ padding: '6px 12px' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="animate-fade-in" style={{ 
                          padding: '0 24px 24px',
                          borderTop: '1px solid var(--color-border)',
                          marginTop: '-1px',
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
                            {/* Data Column */}
                            <div>
                              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Parameters</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {Object.entries(result.input_params).map(([k, v]) => (
                                  <div key={k} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{k}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{String(v)}</div>
                                  </div>
                                ))}
                              </div>

                              <h4 style={{ fontSize: '14px', marginBottom: '12px', marginTop: '24px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📈 Results</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {Object.entries(result.output_data).map(([k, v]) => (
                                  <div key={k} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{k}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-accent-purple)' }}>{String(v)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Graph Column */}
                            <div>
                              <h4 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Reconstructed Graph</h4>
                              <div style={{ height: '200px', width: '100%', marginBottom: '12px' }}>
                                <Graph 
                                  data={vPts} 
                                  xLabel="Time (ms)" 
                                  yLabel="Voltage (V)" 
                                  title={mode === 'charge' ? 'Charging Curve' : 'Discharge Curve'}
                                  color="#ff0000"
                                  height={200}
                                  showArea
                                />
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Graph generated for τ = {tau.toFixed(1)} ms
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
