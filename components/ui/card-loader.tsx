'use client'

import React from 'react'

interface CardLoaderProps {
  message?: string
  className?: string
}

export default function CardLoader({ message = "Loading...", className = "" }: CardLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className="relative flex justify-center items-center ml-[-70px] h-[120px]">
        <div className="relative h-[100px] w-[140px]">
          {/* Card 1 */}
          <div className="card card-1 absolute top-0 h-[100px] w-[70px] border-3 border-warm-gray200 rounded-md bg-gradient-to-br from-coral to-coral-dark flex justify-center items-center transition-transform duration-200 ease-out z-30 ml-5">
            <div className="w-12 h-12 bg-white/20 rounded-full"></div>
          </div>
          
          {/* Card 2 */}
          <div className="card card-2 absolute top-0 h-[100px] w-[70px] border-3 border-warm-gray200 rounded-md bg-gradient-to-br from-warm-gray200 to-warm-gray300 flex justify-center items-center transition-transform duration-200 ease-out z-20 ml-2.5">
            <div className="w-12 h-12 bg-white/20 rounded-full"></div>
          </div>
          
          {/* Card 3 */}
          <div className="card card-3 absolute top-0 h-[100px] w-[70px] border-3 border-warm-gray200 rounded-md bg-gradient-to-br from-coral-light to-coral flex justify-center items-center transition-transform duration-200 ease-out z-10">
            <div className="w-12 h-12 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {message && (
        <p className="text-warm-gray500 font-medium text-lg">{message}</p>
      )}
      
      <style jsx>{`
        .card-1 {
          animation: card-1-anim 6s infinite cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        
        .card-2 {
          animation: card-2-anim 6s infinite cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        
        .card-3 {
          animation: card-3-anim 6s infinite cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        
        @keyframes card-1-anim {
          0% { transform: translateX(0) rotate(0deg); z-index: 30; }
          16.66666% { transform: translateX(95px) rotate(15deg); z-index: 30; }
          33.33333% { transform: translateX(-20px) rotate(0deg); z-index: 10; }
          49.99999% { transform: translateX(-20px) rotate(0deg); z-index: 10; }
          66.66666% { transform: translateX(-10px) rotate(0deg); z-index: 20; }
          83.33333% { transform: translateX(-10px) rotate(0deg); z-index: 20; }
          100% { transform: translateX(0) rotate(0deg); z-index: 30; }
        }
        
        @keyframes card-2-anim {
          0% { transform: translateX(0) rotate(0deg); z-index: 20; }
          16.66666% { transform: translateX(0) rotate(0deg); z-index: 20; }
          33.33333% { transform: translateX(10px) rotate(0deg); z-index: 30; }
          49.99999% { transform: translateX(105px) rotate(15deg); z-index: 30; }
          66.66666% { transform: translateX(-10px) rotate(0deg); z-index: 10; }
          83.33333% { transform: translateX(-10px) rotate(0deg); z-index: 10; }
          100% { transform: translateX(0) rotate(0deg); z-index: 20; }
        }
        
        @keyframes card-3-anim {
          0% { transform: translateX(0) rotate(0deg); z-index: 10; }
          16.66666% { transform: translateX(0) rotate(0deg); z-index: 10; }
          33.33333% { transform: translateX(10px) rotate(0deg); z-index: 20; }
          49.99999% { transform: translateX(10px) rotate(0deg); z-index: 20; }
          66.66666% { transform: translateX(20px) rotate(0deg); z-index: 30; }
          83.33333% { transform: translateX(115px) rotate(15deg); z-index: 30; }
          100% { transform: translateX(0) rotate(0deg); z-index: 10; }
        }
      `}</style>
    </div>
  )
}
