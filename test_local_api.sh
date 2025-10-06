#!/bin/bash

echo "🧪 Testing Learn More via local API endpoint..."
echo "================================================"
echo ""

# Make sure dev server is running on localhost:3000
API_URL="http://localhost:3000/api/byo-enhance-preview"

# Test cases
declare -a tests=(
  "Tesla Model 3:Electric vehicles from Tesla, BMW, Audi:Tesla Model 3,BMW i4,Audi e-tron"
  "Yosemite National Park:National parks to visit:Yosemite,Yellowstone,Grand Canyon"
  "iPhone 15 Pro:Smartphones to buy:iPhone 15 Pro,Samsung Galaxy S24,Google Pixel 8"
  "Pizza Margherita:Dinner options:Pizza,Pasta,Salad"
  "Golden Retriever:Dog breeds:Golden Retriever,Labrador,German Shepherd"
  "Blue:Favorite colors:Red,Blue,Green"
)

for test in "${tests[@]}"; do
  IFS=':' read -r option_name context all_options <<< "$test"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Testing: $option_name"
  echo "   Context: $context"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Convert comma-separated options to JSON array
  IFS=',' read -ra OPTIONS_ARRAY <<< "$all_options"
  OPTIONS_JSON="["
  for opt in "${OPTIONS_ARRAY[@]}"; do
    if [ "$OPTIONS_JSON" != "[" ]; then
      OPTIONS_JSON+=","
    fi
    OPTIONS_JSON+="\"$opt\""
  done
  OPTIONS_JSON+="]"
  
  # Call local API
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"optionName\": \"$option_name\",
      \"contextDescription\": \"$context\",
      \"allOptions\": $OPTIONS_JSON
    }")
  
  # Parse and display result using Python
  echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'error' in data:
        print(f\"❌ ERROR: {data.get('error')}\")
    elif 'modules' in data:
        modules = data.get('modules', [])
        citations = data.get('citations', [])
        print(f\"✅ Received {len(modules)} modules:\")
        for i, module in enumerate(modules, 1):
            mod_type = module.get('type', 'unknown')
            print(f\"  {i}. [{mod_type}]\", end='')
            if mod_type == 'hero_image':
                url = module.get('image_url', 'no url')
                print(f\" - {url[:80]}...\")
            elif mod_type == 'image_gallery':
                images = module.get('images', [])
                print(f\" - {len(images)} images\")
            elif mod_type == 'title_and_paragraph':
                title = module.get('title', 'no title')
                content_len = len(module.get('content', ''))
                print(f\" - {title} ({content_len} chars)\")
            elif mod_type == 'pricing':
                range_val = module.get('range', 'no range')
                note = module.get('note', '')
                print(f\" - {range_val}\" + (f\" ({note})\" if note else \"\"))
            elif mod_type == 'key_value_pairs':
                pairs = module.get('pairs', [])
                print(f\" - {len(pairs)} pairs\")
                for pair in pairs[:3]:  # Show first 3
                    print(f\"      • {pair.get('key')}: {pair.get('value')}\")
            elif mod_type == 'title_and_list':
                title = module.get('title', 'no title')
                items = module.get('items', [])
                print(f\" - {title} ({len(items)} items)\")
            elif mod_type == 'tags':
                items = module.get('items', [])
                print(f\" - {len(items)} tags: {', '.join(items[:5])}\")
            elif mod_type == 'color_block':
                hex_val = module.get('hex', '')
                name = module.get('name', '')
                print(f\" - {name} ({hex_val})\")
            elif mod_type == 'location':
                address = module.get('address', 'no address')
                print(f\" - {address}\")
            elif mod_type == 'hours':
                schedule = module.get('schedule', 'no schedule')
                print(f\" - {schedule}\")
            elif mod_type == 'reviews':
                rating = module.get('rating', 'N/A')
                count = module.get('count', 'N/A')
                print(f\" - {rating} ({count} reviews)\")
            else:
                print()
        if citations:
            print(f\"\n📚 Citations: {len(citations)}\")
    else:
        print(\"❌ Unexpected response format\")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f\"❌ Error parsing response: {e}\")
    print(sys.stdin.read())
"
  
  echo ""
  echo ""
  sleep 1  # Small delay between requests
done

echo "✅ Testing complete!"
