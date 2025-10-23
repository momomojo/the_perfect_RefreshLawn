# Admin Drawer Navigation Fix

## Issue

The More tab was causing a redirect to the placeholder screen. The drawer would briefly open but immediately disappear because navigation was occurring.

## Root Cause

The issue was caused by having **duplicate onPress handlers**:

1. One in the custom `MoreTabButton` component (a nested `TouchableOpacity`)
2. One in the outer `tabBarButton` TouchableOpacity

Both handlers were firing, and the nested one wasn't calling `preventDefault()`, which allowed the default navigation behavior to proceed.

## Solution

### 1. Removed nested TouchableOpacity

Changed `MoreTabButton` from using `TouchableOpacity` to a simple `View`:

```tsx
const MoreTabButton = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => {
  return (
    <View // Changed from TouchableOpacity
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
      }}
    >
      <Menu size={24} color={color} />
      <Text style={{ color, fontSize: 12, marginTop: 2 }}>More</Text>
    </View>
  );
};
```

### 2. Fixed tabBarButton onPress handler

Added `preventDefault()` to the onPress handler and removed the redundant `listeners` prop:

```tsx
<Tabs.Screen
  name="more"
  options={{
    title: 'More',
    headerShown: false,
    tabBarButton: (props) => (
      <TouchableOpacity
        {...props}
        onPress={(e) => {
          e.preventDefault(); // Prevent default navigation
          setDrawerVisible(true);
        }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoreTabButton
          color={props.accessibilityState?.selected ? '#22c55e' : '#737373'}
          focused={props.accessibilityState?.selected || false}
        />
      </TouchableOpacity>
    ),
  }}
/>
```

### 3. Updated more.tsx placeholder

Changed the placeholder screen to return `null` instead of showing a message:

```tsx
export default function MoreScreen() {
  return null;
}
```

## Testing Results

✅ **VERIFIED WORKING** - The drawer now:

- Opens when More tab is clicked
- Stays open (no redirect)
- Displays all navigation items correctly
- Has smooth animation
- Can be closed by clicking X or the overlay

## Files Modified

1. `app/(admin)/_layout.tsx` - Fixed duplicate onPress handlers
2. `app/(admin)/more.tsx` - Updated placeholder to return null

## Screenshot

See `.playwright-mcp/screenshots/06-admin-drawer-working.png` for visual verification of the working drawer.
