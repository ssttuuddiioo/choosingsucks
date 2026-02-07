import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			electric: {
  				purple: '#8B5CF6',
  				purpleLight: '#A855F7'
  			},
  			hot: {
  				pink: '#EC4899',
  				pinkLight: '#F472B6'
  			},
  			lime: {
  				green: '#84CC16',
  				greenLight: '#A3E635'
  			},
  			orange: {
  				burst: '#F97316',
  				burstLight: '#FB923C'
  			},
  			deep: {
  				blue: '#1E40AF',
  				blueLight: '#3B82F6'
  			},
  			warm: {
  				cream: '#FAFAF8',
  				bg: '#F5F5F0',
  				gray100: '#EDEDEB',
  				gray200: '#D4D4CF',
  				gray300: '#A3A39E',
  				gray500: '#6B6B66',
  				gray700: '#3D3D3A',
  				black: '#1A1A1A',
  			},
  			coral: {
  				DEFAULT: '#E07A5F',
  				light: '#E8967E',
  				dark: '#C4654A',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		backgroundImage: {
  			'gradient-electric': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
  			'gradient-pink': 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  			'gradient-lime': 'linear-gradient(135deg, #84CC16 0%, #A3E635 100%)',
  			'gradient-orange': 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
  			'gradient-blue': 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  			'gradient-primary': 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  			'gradient-warm': 'linear-gradient(180deg, #FAFAF8 0%, #F5F5F0 100%)',
  			'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  			'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
  			'gradient-mesh': 'linear-gradient(45deg, #8B5CF6 0%, #EC4899 25%, #F97316 50%, #84CC16 75%, #3B82F6 100%)'
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		fontFamily: {
  			outfit: [
  				'Outfit',
  				'sans-serif'
  			],
  			jetbrains: [
  				'JetBrains Mono',
  				'monospace'
  			]
  		},
  		animation: {
  			gradient: 'gradient 8s ease infinite',
  			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'bounce-slow': 'bounce 2s infinite',
  			shimmer: 'shimmer 2s linear infinite',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'fade-in': 'fadeIn 0.2s ease-out',
  			'bounce-in': 'bounceIn 0.5s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			'rotate-in': 'rotateIn 0.3s ease-out'
  		},
  		keyframes: {
  			gradient: {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'left center'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center'
  				}
  			},
  			shimmer: {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			bounceIn: {
  				'0%': {
  					transform: 'scale(0.3)',
  					opacity: '0'
  				},
  				'50%': {
  					transform: 'scale(1.05)'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			rotateIn: {
  				'0%': {
  					transform: 'rotate(-10deg) scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'rotate(0deg) scale(1)',
  					opacity: '1'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

export default config