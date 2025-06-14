# Virtual inheritance

Things get a lot more interesting when virtual inheritance gets involved. This makes the compiler de-duplicate virtual bases, causing derived-to-base offsets to become dependent on the entire inheritance hierarchy. This has a lot of ramifications, and the different ways MWCC and Itanium solve this offset problem leads to the conclusion about design priorities I outlined in the [first page](index.md).

## No virtual functions

Let's start with our initial example changed just by making B and C inherit virtually from A:

```cpp
struct A {
    int a;
};

struct B : virtual A {
    int b;
};

struct C : virtual A {
    int c;
};

struct D : B, C {
    int d;
};
```

```dot
digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        D [label=<<table cellspacing="0">
            <tr><td rowspan="7">D</td><td rowspan="2">B</td><td>0x0</td><td port="D_vb1">vbase ptr</td></tr>
            <tr><td>0x4</td><td>B::b</td></tr>
            <tr><td rowspan="2">C</td><td>0x8</td><td port="D_vb2">vbase ptr</td></tr>
            <tr><td>0xc</td><td>C::c</td></tr>
            <tr><td colspan="2">0x10</td><td>d</td></tr>
            <tr><td>A</td><td>0x14</td><td port="D_A">A::a</td></tr>
        </table>>];
        }
        D:D_vb1:e -> D:D_A:e;
        D:D_vb2:e -> D:D_A:e;
    }

    subgraph cluster_itanium {
        label="Itanium";
        {rank=same
        D2 [label=<<table cellspacing="0">
            <tr><td rowspan="7">D</td><td rowspan="2">B</td><td>0x0</td><td port="D_vt1">__vtable</td></tr>
            <tr><td>0x4</td><td>B::b</td></tr>
            <tr><td rowspan="2">C</td><td>0x8</td><td port="D_vt2">__vtable</td></tr>
            <tr><td>0xc</td><td>C::c</td></tr>
            <tr><td colspan="2">0x10</td><td>d</td></tr>
            <tr><td>A</td><td>0x14</td><td>A::a</td></tr>
        </table>>];
        D2_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for D</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="4">B_vtable</td><td>0x14 (vbase offset)</td></tr>
            <tr><td>0 (concrete offset)</td></tr>
            <tr><td>D::__RTTI</td></tr>
            <tr><td port="D_RTTI1"></td></tr>
            <tr><td rowspan="4">C_vtable</td><td>0xc(vbase offset)</td></tr>
            <tr><td>-0x8(concrete offset)</td></tr>
            <tr><td>D::__RTTI</td></tr>
            <tr><td port="D_RTTI2"></td></tr>
        </table>>];
        }
        D2:D_vt1 -> D2_vt:D_RTTI1:w
        D2:D_vt2 -> D2_vt:D_RTTI2:w
    }
}
```

MWCC opts to not output a vtable at all, since there's no virtual functions involved. What it does have, in contrast to Itanium, is pointers to the virtual base, whereas Itanium uses an offset prepended in the respective vtables, one for each virtual base. Meanwhile, MWCC will keep adding vbase pointers into the object layout as more virtual bases are added.

Itanium's prepended list is also partly why its vtable pointers point to the start of the virtual function pointers. The RTTI, concrete offset and the vbase offsets are then just on a list of increasingly negative offsets.

MWCC doesn't deduplicate these virtual base pointers, even if it could. Any class with a direct virtual base will get a vbase pointer added after all non-virtual base class objects, even though any function requiring a vbase pointer will use the first available one(in this case, the one at 0x0, in the B sub-object).

```cpp
struct A {
    int a;
};

struct B : virtual A {
    int b;
};

struct C : virtual A {
    int c;
};

struct D : virtual A, B, C {
    int d;
};
```

```dot
digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        D [label=<<table cellspacing="0">
            <tr><td rowspan="7">D</td><td rowspan="2">B</td><td>0x0</td><td port="D_vb1">vbase ptr</td></tr>
            <tr><td>0x4</td><td>B::b</td></tr>
            <tr><td rowspan="2">C</td><td>0x8</td><td port="D_vb2">vbase ptr</td></tr>
            <tr><td>0xc</td><td>C::c</td></tr>
            <tr><td colspan="2">0x10</td><td port="D_vb3">vbase ptr</td></tr>
            <tr><td colspan="2">0x14</td><td>d</td></tr>
            <tr><td>A</td><td>0x18</td><td port="D_A">A::a</td></tr>
        </table>>];
        }
        D:D_vb1:e -> D:D_A:e;
        D:D_vb2:e -> D:D_A:e;
        D:D_vb3:e -> D:D_A:e;
    }
}
```
