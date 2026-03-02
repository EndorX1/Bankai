from enum import Enum
from plum import dispatch
from typing import TypeVar, Union, Generic, List, Tuple
from spire.doc.common import *
from spire.doc import *
from ctypes import *
import abc

class CompositeDocumentObject (  DocumentObject, ICompositeObject) :
    """
    An abstract base class representing a composite document object that can contain other document objects.
    """
    @property
    def IsComposite(self)->bool:
        """
        Gets a value indicating whether this object is a composite object.
        """
        GetDllLibDoc().CompositeDocumentObject_get_IsComposite.argtypes=[c_void_p]
        GetDllLibDoc().CompositeDocumentObject_get_IsComposite.restype=c_bool
        ret = CallCFunction(GetDllLibDoc().CompositeDocumentObject_get_IsComposite,self.Ptr)
        return ret

    @property
    def Count(self)->int:
        """
        Gets the number of child objects in the collection.
        """
        GetDllLibDoc().CompositeDocumentObject_get_Count.argtypes=[c_void_p]
        GetDllLibDoc().CompositeDocumentObject_get_Count.restype=c_int
        ret = CallCFunction(GetDllLibDoc().CompositeDocumentObject_get_Count,self.Ptr)
        return ret


    def GetIndex(self ,entity:'IDocumentObject')->int:
        """
        Retrieves the index of the specified entity within the composite object.
        
        param:
            entity:The document object to find the index for.
        returns:
            The index of the entity within the composite object; returns -1 if not found.
        """
        intPtrentity:c_void_p = entity.Ptr

        GetDllLibDoc().CompositeDocumentObject_GetIndex.argtypes=[c_void_p ,c_void_p]
        GetDllLibDoc().CompositeDocumentObject_GetIndex.restype=c_int
        ret = CallCFunction(GetDllLibDoc().CompositeDocumentObject_GetIndex,self.Ptr, intPtrentity)
        return ret


    def IndexOf(self ,docObject:'IDocumentObject')->int:
        """
        Retrieves the index of the specified document object within the collection of child objects.
        
        param:
            docObject:The document object to find in the child objects collection.
        returns:
            The zero-based index of the document object; returns -1 if not found.
        """
        intPtrdocObject:c_void_p = docObject.Ptr

        GetDllLibDoc().CompositeDocumentObject_IndexOf.argtypes=[c_void_p ,c_void_p]
        GetDllLibDoc().CompositeDocumentObject_IndexOf.restype=c_int
        ret = CallCFunction(GetDllLibDoc().CompositeDocumentObject_IndexOf,self.Ptr, intPtrdocObject)
        return ret

