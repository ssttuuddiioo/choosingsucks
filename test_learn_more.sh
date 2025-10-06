#!/bin/bash

# Test Learn More functionality with various edge cases
OPENAI_API_KEY="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"

echo "🧪 Testing Learn More functionality..."
echo "======================================"
echo ""

# Test cases
declare -a tests=(
  "Tesla Model 3:Electric vehicles from Tesla, BMW, Audi"
  "Yosemite National Park:National parks to visit"
  "iPhone 15 Pro:Smartphones to buy"
)

for test in "${tests[@]}"; do
  IFS=':' read -r option_name context <<< "$test"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Testing: $option_name"
  echo "   Context: $context"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Create the prompt
  PROMPT="Context: $context

User is choosing between: Option A, Option B, $option_name

Search the web for current information about: \"$option_name\"

If you find high-quality images in search results, include them using hero_image or image_gallery modules.

Provide 3-6 relevant modules using ONLY these types:

EXAMPLES BY CONTENT TYPE:

Golf Course:
- location: Street address, city, state
- title_and_paragraph: {title: \"About\", content: \"Brief description\"}
- pricing: {range: \"\$20-50\", note: \"Varies by season\"}
- hours: {schedule: \"Daily 7am-7pm\"}
- reviews: {rating: \"4.2\", count: \"150\", summary: \"Well-maintained course\"}

Rental Car (e.g. Economy Car, Luxury Sedan):
- title_and_paragraph: {title: \"Overview\", content: \"Description of vehicle type and features\"}
- pricing: {range: \"\$30-80 per day\", note: \"Prices vary by location and season\"}
- key_value_pairs: {pairs: [{key: \"Category\", value: \"Economy\"}, {key: \"Capacity\", value: \"5 passengers\"}, {key: \"Fuel Type\", value: \"Gasoline\"}]}
- title_and_list: {title: \"Common Features\", items: [\"Air conditioning\", \"Automatic transmission\", \"Bluetooth\"]}

Baby Name:
- title_and_paragraph: {title: \"Meaning & Origin\", content: \"Latin origin...\"}
- key_value_pairs: {pairs: [{key: \"Origin\", value: \"Latin\"}, {key: \"Popularity\", value: \"Top 5\"}, {key: \"Gender\", value: \"Male\"}]}
- title_and_list: {title: \"Famous People\", items: [\"Oliver Twist\", \"Oliver Stone\"]}

Color:
- color_block: {hex: \"#000080\", name: \"Navy Blue\"}
- title_and_paragraph: {title: \"Symbolism\", content: \"Represents authority...\"}
- tags: {items: [\"Professional\", \"Classic\", \"Formal\"]}

NO meta-commentary. NO conversational language. Just factual modules."

  # Call OpenAI API
  response=$(curl -s https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d @- <<EOF
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": $(echo "$PROMPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "byo_enhancement",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "modules": {
            "type": "array",
            "minItems": 2,
            "maxItems": 6,
            "items": {
              "anyOf": [
                {
                  "type": "object",
                  "properties": {
                    "type": { "type": "string", "enum": ["title_and_paragraph"] },
                    "title": { "type": "string" },
                    "content": { "type": "string" }
                  },
                  "required": ["type", "title", "content"],
                  "additionalProperties": false
                },
                {
                  "type": "object",
                  "properties": {
                    "type": { "type": "string", "enum": ["hero_image"] },
                    "image_url": { "type": "string" },
                    "alt_text": { "type": "string" }
                  },
                  "required": ["type", "image_url", "alt_text"],
                  "additionalProperties": false
                },
                {
                  "type": "object",
                  "properties": {
                    "type": { "type": "string", "enum": ["pricing"] },
                    "range": { "type": "string" },
                    "note": { "type": ["string", "null"] }
                  },
                  "required": ["type", "range", "note"],
                  "additionalProperties": false
                },
                {
                  "type": "object",
                  "properties": {
                    "type": { "type": "string", "enum": ["key_value_pairs"] },
                    "pairs": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "key": { "type": "string" },
                          "value": { "type": "string" }
                        },
                        "required": ["key", "value"],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": ["type", "pairs"],
                  "additionalProperties": false
                },
                {
                  "type": "object",
                  "properties": {
                    "type": { "type": "string", "enum": ["title_and_list"] },
                    "title": { "type": "string" },
                    "items": {
                      "type": "array",
                      "items": { "type": "string" }
                    }
                  },
                  "required": ["type", "title", "items"],
                  "additionalProperties": false
                }
              ]
            }
          }
        },
        "required": ["modules"],
        "additionalProperties": false
      }
    }
  }
}
EOF
  )
  
  # Parse and display result using Python
  echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'error' in data:
        print(f\"❌ ERROR: {data['error']['message']}\")
    elif 'choices' in data and len(data['choices']) > 0:
        content = json.loads(data['choices'][0]['message']['content'])
        modules = content.get('modules', [])
        print(f\"✅ Received {len(modules)} modules:\")
        for i, module in enumerate(modules, 1):
            mod_type = module.get('type', 'unknown')
            print(f\"  {i}. {mod_type}\", end='')
            if mod_type == 'hero_image':
                print(f\" - {module.get('image_url', 'no url')[:50]}...\")
            elif mod_type == 'title_and_paragraph':
                print(f\" - {module.get('title', 'no title')}\")
            elif mod_type == 'pricing':
                print(f\" - {module.get('range', 'no range')}\")
            elif mod_type == 'key_value_pairs':
                print(f\" - {len(module.get('pairs', []))} pairs\")
            elif mod_type == 'title_and_list':
                print(f\" - {module.get('title', 'no title')}\")
            else:
                print()
        print(f\"\n📄 Full JSON:\")
        print(json.dumps(content, indent=2))
    else:
        print(\"❌ Unexpected response format\")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f\"❌ Error parsing response: {e}\")
    print(sys.stdin.read())
"
  
  echo ""
  echo ""
done

echo "✅ Testing complete!"