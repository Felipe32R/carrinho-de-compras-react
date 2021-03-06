import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');;
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const previousCartValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(previousCartValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, previousCartValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; //imutabilidade
      const productExists = updatedCart.find((product) => product.id === productId); //se o produto já existe ou não no carrinho
      
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount; // quantidade em estoque do produto clicado
      const currentAmount = productExists ? productExists.amount : 0; //quantidade no carrinho
      const amount = currentAmount + 1; // quantidade desejada ao clicar em +

      if (amount > stockAmount){
      toast.error('Quantidade solicitada fora de estoque');
      return;
      }
      if(productExists){ // se já existe no carrinho
        productExists.amount = amount;
      }else { // se é um produto novo no carrinho
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1 //1 pois é a primeira vez sendo adicionado ao carrinho
        }
        updatedCart.push(newProduct); 
      }
      setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)); seta os valores no localStorage passando o array para JSON
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1);
      }else{
        throw new Error();
      }
      setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount, //valor desejado
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
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
