import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useProductOptions() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_code, product_name, brand, category, unit, stock_quantity')
        .eq('is_active', true)
        .order('product_code')
      if (isMounted) {
        if (!error) setProducts(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('product-options')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const codes = [...new Set(products.map((p) => p.product_code))]
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))]
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  return { products, codes, brands, categories, loading }
}

export function useProvinceOptions() {
  const [provinces, setProvinces] = useState([])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('provinces').select('*').order('name_th')
      if (!error) setProvinces(data || [])
    }
    load()
  }, [])

  return provinces
}
