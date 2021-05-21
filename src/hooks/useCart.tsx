import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInDatabase = cart.reduce( (acc,product) =>{
        if (product.id === productId){
          acc.isProductExist = 1;
          acc.amount = product.amount;
        }
        return acc;
      },{isProductExist:0,amount:0})
      if(productInDatabase.isProductExist){
        await updateProductAmount({productId,amount:productInDatabase.amount+1});
      }
      else{
        await api.get(`/products/${productId}`).then(response => {
          const product = response.data;
          product.amount = 1;
          const newCart = [...cart, product];
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart',JSON.stringify(newCart));
        })
      }
    
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product =>{
        if (product.id !== productId){
          return product;
        }
      })
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const checkAmount = async (productId:number) =>{
    const response = await api.get(`/stock/${productId}`);
    const amount   = await response.data.amount;
    return amount;
  } 
  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await api.get(`/products/${productId}`).then(async response => {
        const product = response.data;
        const amountStock = await checkAmount(productId);
        if (amountStock >= amount){
          product.amount = amount;
          const newCart = cart.map(productCart =>{
            if (productCart.id !== productId){
              return productCart;
            }else{
              return product;
            }
          })
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart',JSON.stringify(newCart));
        }
        else{
          toast.error('Quantidade solicitada fora de estoque');
        }
      })

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
