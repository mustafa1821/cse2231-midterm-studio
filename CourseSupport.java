import java.util.*;

/** Small self-contained teaching models; not the OSU components.jar API. */
public final class CourseSupport {
    private CourseSupport() {}
    public static class Node<T> {
        public T data;
        public Node<T> left, right;
        public Node(T value) { this.data=value; }
        public Node(T value, Node<T> l, Node<T> r) { data=value; left=l; right=r; }
    }
    public static Node<Integer> n(int x) { return new Node<>(x); }
    public static Node<Integer> n(int x, Node<Integer> l, Node<Integer> r) { return new Node<>(x,l,r); }
    public static String tree(Node<?> node) {
        return node==null?"()":node.data+"("+tree(node.left)+tree(node.right)+")";
    }
    public static class SNode {
        public String kind, condition, call;
        public ArrayList<SNode> children=new ArrayList<>();
        public SNode(String kind) { this.kind=kind; }
        public static SNode block(SNode... kids) {SNode s=new SNode("BLOCK");s.children.addAll(Arrays.asList(kids));return s;}
        public static SNode call(String x) { SNode s=new SNode("CALL");s.call=x;return s; }
        public static SNode when(String k,String c,SNode... kids) { SNode s=new SNode(k);s.condition=c;s.children.addAll(Arrays.asList(kids));return s; }
        public String repr() {
            StringBuilder b=new StringBuilder(kind);
            if(condition!=null)b.append(":").append(condition);
            if(call!=null)b.append(":").append(call);
            b.append("[");for(SNode x:children)b.append(x.repr()).append(",");return b.append("]").toString();
        }
    }
    public static class BProgram {
        public String name;
        public LinkedHashMap<String,SNode> context=new LinkedHashMap<>();
        public SNode body=SNode.block();
        public BProgram(String n) { name=n; }
        public String repr() {
            StringBuilder b=new StringBuilder(name).append('|');
            for(String k:context.keySet())b.append(k).append('=').append(context.get(k).repr()).append(';');
            return b.append('|').append(body.repr()).toString();
        }
    }
    public static class LNode {
        public int data;
        public LNode next, prev;
        public LNode(int x){data=x;}
    }
    public static class LinkedStack {
        public LNode top;
        public int length;
        public String view(){StringBuilder s=new StringBuilder();for(LNode x=top;x!=null;x=x.next)s.append(x.data).append(',');return s.toString();}
    }
    public static class ReverseQueue {
        public LNode preFront=new LNode(-999), postRear=new LNode(-999);
        public int length=0;
        public ReverseQueue(){preFront.next=postRear;postRear.prev=preFront;}
        public List<Integer> values(){ArrayList<Integer> r=new ArrayList<>();for(LNode x=postRear.prev;x!=preFront;x=x.prev){if(x==null||r.size()>10000)throw new IllegalStateException("Broken backward links");r.add(x.data);}return r;}
        public boolean integrity(){
            if(preFront.prev!=null||postRear.next!=null)return false;
            LNode p=preFront,cur=preFront.next;int n=0;
            while(cur!=null && cur!=postRear && n<=10000){if(cur.prev!=p)return false;p=cur;cur=cur.next;n++;}
            return cur==postRear && postRear.prev==p && n==length;
        }
    }
    public static class CursorList {
        public ArrayList<Integer> left=new ArrayList<>(),right=new ArrayList<>();
        public CursorList(List<Integer> l,List<Integer> r){left.addAll(l);right.addAll(r);}
        public String view(){return left.toString()+"|"+right.toString();}
    }
}
